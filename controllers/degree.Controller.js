import process from 'node:process';
import dotenv from 'dotenv';
import redisClient from '../config/config-redis.js';
import Degree from '../DB/models/degree.model.js';
import userModel from '../DB/models/user.model.js';
import { ErrorClass } from '../middlewares/ErrorClass.js';
import logger from '../middlewares/logger.js';
import { notificationController } from './notification.controller.js';
import { degreeSchemaValidation } from '../validation/degree.Validation.js';

dotenv.config();
/**
 * @route POST /degrees
 */
export const createDegree = async (req, res, next) => {
  try {
    // Validate input using Joi schema
    const { error } = degreeSchemaValidation.validate(req.body);
    if (error) return next(new ErrorClass(error.message, 400));

    let imagePath;
    if (req.body.img) {
      imagePath = req.body.img;
    } else if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ error: 'Image is required (file or URL)' });
    }

    const newDegree = await Degree.create({
      ...req.body,
      img: imagePath
    });

    logger.info('Degree created successfully');

    // Clear cache to repopulate on next GET request
    const cacheKey = process.env.CACHE_DEGREE_KEY || 'degrees_cache';
    await redisClient.del(cacheKey);

    // Notify all users about the new degree
    const users = await userModel.find({ isDeleted: false, isConfirmed: true });
    if (users && users.length > 0) {
      const userIds = users.map((user) => user._id);

      await notificationController.createMultiRecipientNotification(
        userIds,
        'system',
        'New Degree Added',
        `A new degree "${newDegree.name}" has been added to our collection.`,
        newDegree._id,
        'Degrees'
      );
      logger.info(`Notification sent to ${users.length} users about new Degree`);
    }

    res.status(201).json({ message: 'Degree created successfully', data: newDegree });
  } catch (error) {
    logger.error(`Error creating degree: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /degrees
 */
export const getAllDegrees = async (req, res, next) => {
  try {
    const cacheKey = process.env.CACHE_DEGREE_KEY || 'degrees_cache';

    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Pagination & Filtering
    let { skip, limit, filter } = req.query;
    skip = parseInt(skip) || 0;
    limit = parseInt(limit) || 10;
    filter = filter ? JSON.parse(filter) : {};

    const degrees = await Degree.find(filter).skip(skip).limit(limit);
    if (!degrees.length) return next(new ErrorClass('No degrees found', 404));

    // Store in cache
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(degrees));

    logger.info('Fetching all degrees');
    res.json({ message: 'Degrees fetched successfully', data: degrees });
  } catch (error) {
    logger.error(`Error fetching degrees: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /degrees/:id
 */
export const getDegreeById = async (req, res, next) => {
  try {
    const degree = await Degree.findOne({ _id: req.params.id });
    if (!degree) return next(new ErrorClass('Degree not found', 404));

    res.json({ data: degree });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route PUT /degrees/:id
 */
export const updateDegreeById = async (req, res, next) => {
  try {
    const oldDegree = await Degree.findOne({ _id: req.params.id });
    if (!oldDegree) return next(new ErrorClass('Degree not found', 404));

    // Validate input using Joi schema
    const { error } = degreeSchemaValidation.validate(req.body, { abortEarly: false });
    if (error) return next(new ErrorClass(`Validation error: ${error.message}`, 400));

    const updatedDegree = await Degree.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    );

    if (!updatedDegree) return next(new ErrorClass('Degree not found', 404));

    const cacheKey = process.env.CACHE_DEGREE_KEY || 'degrees_cache';

    // Update cache if exists
    const cachedDegrees = await redisClient.get(cacheKey);
    if (cachedDegrees) {
      let degreesList = JSON.parse(cachedDegrees);
      degreesList = degreesList.map((degree) =>
        degree._id === req.params.id ? updatedDegree : degree
      );

      await redisClient.setEx(cacheKey, 3600, JSON.stringify(degreesList));
    } else {
      await redisClient.del(cacheKey);
    }

    // Check for significant changes
    const significantChanges = [];
    if (oldDegree.name !== updatedDegree.name) {
      significantChanges.push(`Title changed from "${oldDegree.name}" to "${updatedDegree.name}"`);
    }
    if (oldDegree.description !== updatedDegree.description) {
      significantChanges.push(`Description updated: "${updatedDegree.description}"`);
    }

    // Notify admins if there are changes
    if (significantChanges.length > 0) {
      const adminUsers = await userModel.find({ role: 'Admin' });
      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((admin) => admin._id);

        await notificationController.createMultiRecipientNotification(
          adminIds,
          'system',
          'Degree Updated',
          `The degree "${updatedDegree.name}" has been updated: ${significantChanges.join(', ')}.`,
          updatedDegree._id,
          'Degrees'
        );
        logger.info(`Notification sent to ${adminUsers.length} admin users about degree update`);
      }
    }

    res.json({ message: 'Degree updated successfully', data: updatedDegree });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route DELETE /degrees/:id
 */
export const deleteDegreeById = async (req, res, next) => {
  try {
    const deletedDegree = await Degree.findOneAndDelete({ _id: req.params.id });
    if (!deletedDegree) return next(new ErrorClass('Degree not found', 404));

    const cacheKey = process.env.CACHE_DEGREE_KEY || 'degrees_cache';

    // Update cache if exists
    const cachedDegrees = await redisClient.get(cacheKey);
    if (cachedDegrees) {
      let degreesList = JSON.parse(cachedDegrees);
      degreesList = degreesList.filter((degree) => degree._id !== req.params.id);

      await redisClient.setEx(cacheKey, 3600, JSON.stringify(degreesList));
    } else {
      await redisClient.del(cacheKey);
    }

    res.json({ message: 'Degree deleted successfully' });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};