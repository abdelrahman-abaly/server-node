import process from 'node:process';
import dotenv from 'dotenv';
import redisClient from '../config/config-redis.js';
import Module from '../DB/models/module.model.js';
import userModel from '../DB/models/user.model.js';
import Course from '../DB/models/course.model.js';
import Topic from '../DB/models/Topic.model.js';
import { ErrorClass } from '../middlewares/ErrorClass.js';
import logger from '../middlewares/logger.js';
import { notificationController } from './notification.controller.js';
import { moduleSchemaValidation } from '../validation/moduleValidation.js';

dotenv.config();

const CACHE_KEY = process.env.CACHE_MODULE_KEY || 'modules_cache';

/**
 * @route POST /modules
 */
export const createModule = async (req, res, next) => {
  try {
    // Validate input
    const { error } = moduleSchemaValidation.validate(req.body);
    if (error) return next(new ErrorClass(error.message, 400));

    const newModule = await Module.create(req.body);

    logger.info('Module created successfully');

    // Clear cache to repopulate on next GET request
    await redisClient.del(CACHE_KEY);

    // Notify all users about the new module
    const users = await userModel.find({ isDeleted: false, isConfirmed: true });
    if (users && users.length > 0) {
      const userIds = users.map((user) => user._id);

      await notificationController.createMultiRecipientNotification(
        userIds,
        'system',
        'New Module Added',
        `A new module "${newModule.title}" has been added to our collection.`,
        newModule._id,
        'Modules'
      );
      logger.info(`Notification sent to ${users.length} users about new module`);
    }

    res.status(201).json({ message: 'Module created successfully', data: newModule });
  } catch (error) {
    logger.error(`Error creating module: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /modules
 */
export const getAllModules = async (req, res, next) => {
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

    const modules = await Module.find(filter)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'course',
        select: 'name instructor'
      })
      .populate({
        path: 'topics',
        select: 'title description'
      });

    if (!modules.length) return next(new ErrorClass('No modules found', 404));

    // Store in cache
    await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(modules));

    logger.info('Fetching all modules');
    res.json({ message: 'Modules fetched successfully', data: modules });
  } catch (error) {
    logger.error(`Error fetching modules: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /modules/:id
 */
export const getModuleById = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id)
      .populate({
        path: 'course',
        select: 'name instructor'
      })
      .populate({
        path: 'topics',
        select: 'title description'
      });

    if (!module) return next(new ErrorClass('Module not found', 404));

    res.json({ data: module });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route PUT /modules/:id
 */
export const updateModuleById = async (req, res, next) => {
  try {
    const oldModule = await Module.findById(req.params.id);
    if (!oldModule) return next(new ErrorClass('Module not found', 404));

    // Validate input
    const { error } = moduleSchemaValidation.validate(req.body, { abortEarly: false });
    if (error) return next(new ErrorClass(`Validation error: ${error.message}`, 400));

    const updatedModule = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedModule) return next(new ErrorClass('Module not found', 404));

    // Update cache if exists
    const cachedModules = await redisClient.get(CACHE_KEY);
    if (cachedModules) {
      let modulesList = JSON.parse(cachedModules);
      modulesList = modulesList.map((module) =>
        module._id === req.params.id ? updatedModule : module
      );

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(modulesList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    // Check for significant changes
    const significantChanges = [];
    if (oldModule.title !== updatedModule.title) {
      significantChanges.push(`Title changed from "${oldModule.title}" to "${updatedModule.title}"`);
    }
    if (oldModule.duration !== updatedModule.duration) {
      significantChanges.push(`Duration updated from "${oldModule.duration}" to "${updatedModule.duration}"`);
    }

    // Notify admins if there are changes
    if (significantChanges.length > 0) {
      const adminUsers = await userModel.find({ role: 'Admin' });
      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((admin) => admin._id);

        await notificationController.createMultiRecipientNotification(
          adminIds,
          'system',
          'Module Updated',
          `The module "${updatedModule.title}" has been updated: ${significantChanges.join(', ')}.`,
          updatedModule._id,
          'Modules'
        );
        logger.info(`Notification sent to ${adminUsers.length} admin users about module update`);
      }
    }

    res.json({ message: 'Module updated successfully', data: updatedModule });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route DELETE /modules/:id
 */
export const deleteModuleById = async (req, res, next) => {
  try {
    const deletedModule = await Module.findByIdAndDelete(req.params.id);
    if (!deletedModule) return next(new ErrorClass('Module not found', 404));

    // Update cache if exists
    const cachedModules = await redisClient.get(CACHE_KEY);
    if (cachedModules) {
      let modulesList = JSON.parse(cachedModules);
      modulesList = modulesList.filter((module) => module._id !== req.params.id);

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(modulesList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};