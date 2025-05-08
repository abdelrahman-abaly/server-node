import process from 'node:process';
import dotenv from 'dotenv';
import redisClient from '../config/config-redis.js';
import CareerResource from '../DB/models/careerResource.model.js';
import userModel from '../DB/models/user.model.js';
import { ErrorClass } from '../middlewares/ErrorClass.js';
import logger from '../middlewares/logger.js';
import { notificationController } from './notification.controller.js';
import { careerResourceSchemaValidation } from '../validation/careerResource.validation.js';

dotenv.config();

const CACHE_KEY = process.env.CACHE_CAREER_RESOURCE_KEY || 'career_resources_cache';

/**
 * @route POST /career-resources
 */
export const createCareerResource = async (req, res, next) => {
  try {
    // Validate input
    const { error } = careerResourceSchemaValidation.validate(req.body);
    if (error) return next(new ErrorClass(error.message, 400));

    const newResource = await CareerResource.create(req.body);

    logger.info('Career resource created successfully');

    // Clear cache to repopulate on next GET request
    await redisClient.del(CACHE_KEY);

    // Notify all users about the new career resource
    const users = await userModel.find({ isDeleted: false, isConfirmed: true });
    if (users && users.length > 0) {
      const userIds = users.map((user) => user._id);

      await notificationController.createMultiRecipientNotification(
        userIds,
        'system',
        'New Career Resource Added',
        `A new career resource "${newResource.question}" has been added to our collection.`,
        newResource._id,
        'CareerResources'
      );
      logger.info(`Notification sent to ${users.length} users about new career resource`);
    }

    res.status(201).json({ message: 'Career resource created successfully', data: newResource });
  } catch (error) {
    logger.error(`Error creating career resource: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /career-resources
 */
export const getAllCareerResources = async (req, res, next) => {
  try {
    // Check cache first
    const cachedData = await redisClient.get(CACHE_KEY);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Pagination & Filtering
    let { skip, limit, filter } = req.query;
    skip = parseInt(skip) || 0;
    limit = parseInt(limit) || 10;
    filter = filter ? JSON.parse(filter) : {};

    const resources = await CareerResource.find(filter)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'CareerResourceCategory',
        select: 'name description'
      });

    if (!resources.length) return next(new ErrorClass('No career resources found', 404));

    // Store in cache
    await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(resources));

    logger.info('Fetching all career resources');
    res.json({ message: 'Career resources fetched successfully', data: resources });
  } catch (error) {
    logger.error(`Error fetching career resources: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /career-resources/:id
 */
export const getCareerResourceById = async (req, res, next) => {
  try {
    const resource = await CareerResource.findById(req.params.id)
      .populate({
        path: 'CareerResourceCategory',
        select: 'name description'
      });

    if (!resource) return next(new ErrorClass('Career resource not found', 404));

    res.json({ data: resource });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route PUT /career-resources/:id
 */
export const updateCareerResourceById = async (req, res, next) => {
  try {
    const oldResource = await CareerResource.findById(req.params.id);
    if (!oldResource) return next(new ErrorClass('Career resource not found', 404));

    // Validate input
    const { error } = careerResourceSchemaValidation.validate(req.body, { abortEarly: false });
    if (error) return next(new ErrorClass(`Validation error: ${error.message}`, 400));

    const updatedResource = await CareerResource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedResource) return next(new ErrorClass('Career resource not found', 404));

    // Update cache if exists
    const cachedResources = await redisClient.get(CACHE_KEY);
    if (cachedResources) {
      let resourcesList = JSON.parse(cachedResources);
      resourcesList = resourcesList.map((resource) =>
        resource._id === req.params.id ? updatedResource : resource
      );

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(resourcesList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    // Check for significant changes
    const significantChanges = [];
    if (oldResource.question !== updatedResource.question) {
      significantChanges.push(`Question changed from "${oldResource.question}" to "${updatedResource.question}"`);
    }
    if (oldResource.answer !== updatedResource.answer) {
      significantChanges.push(`Answer updated.`);
    }

    // Notify admins if there are changes
    if (significantChanges.length > 0) {
      const adminUsers = await userModel.find({ role: 'Admin' });
      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((admin) => admin._id);

        await notificationController.createMultiRecipientNotification(
          adminIds,
          'system',
          'Career Resource Updated',
          `The career resource "${updatedResource.question}" has been updated: ${significantChanges.join(', ')}.`,
          updatedResource._id,
          'CareerResources'
        );
        logger.info(`Notification sent to ${adminUsers.length} admin users about career resource update`);
      }
    }

    res.json({ message: 'Career resource updated successfully', data: updatedResource });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route DELETE /career-resources/:id
 */
export const deleteCareerResourceById = async (req, res, next) => {
  try {
    const deletedResource = await CareerResource.findByIdAndDelete(req.params.id);
    if (!deletedResource) return next(new ErrorClass('Career resource not found', 404));

    // Update cache if exists
    const cachedResources = await redisClient.get(CACHE_KEY);
    if (cachedResources) {
      let resourcesList = JSON.parse(cachedResources);
      resourcesList = resourcesList.filter((resource) => resource._id !== req.params.id);

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(resourcesList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    res.json({ message: 'Career resource deleted successfully' });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};