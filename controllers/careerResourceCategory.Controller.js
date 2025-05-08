import process from 'node:process';
import dotenv from 'dotenv';
import redisClient from '../config/config-redis.js';
import CareerResourceCategory from '../DB/models/careerResourceCategories.model.js';
import userModel from '../DB/models/user.model.js';
import { ErrorClass } from '../middlewares/ErrorClass.js';
import logger from '../middlewares/logger.js';
import { notificationController } from './notification.controller.js';
import { careerResourceCategorySchemaValidation } from '../validation/careerResourceCategories.validation.js';

dotenv.config();

const CACHE_KEY = process.env.CACHE_CAREER_RESOURCE_CATEGORY_KEY || 'career_resource_categories_cache';

/**
 * @route POST /career-resource-categories
 */
export const createCareerResourceCategory = async (req, res, next) => {
  try {
    // Validate input
    const { error } = careerResourceCategorySchemaValidation.validate(req.body);
    if (error) return next(new ErrorClass(error.message, 400));

    const newCategory = await CareerResourceCategory.create(req.body);

    logger.info('Career resource category created successfully');

    // Clear cache to repopulate on next GET request
    await redisClient.del(CACHE_KEY);

    // Notify all users about the new category
    const users = await userModel.find({ isDeleted: false, isConfirmed: true });
    if (users && users.length > 0) {
      const userIds = users.map((user) => user._id);

      await notificationController.createMultiRecipientNotification(
        userIds,
        'system',
        'New Career Resource Category Added',
        `A new career resource category "${newCategory.categoryName}" has been added.`,
        newCategory._id,
        'CareerResourceCategories'
      );
      logger.info(`Notification sent to ${users.length} users about new career resource category`);
    }

    res.status(201).json({ message: 'Career resource category created successfully', data: newCategory });
  } catch (error) {
    logger.error(`Error creating career resource category: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /career-resource-categories
 */
export const getAllCareerResourceCategories = async (req, res, next) => {
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

    const categories = await CareerResourceCategory.find(filter)
      .skip(skip)
      .limit(limit);

    if (!categories.length) return next(new ErrorClass('No career resource categories found', 404));

    // Store in cache
    await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(categories));

    logger.info('Fetching all career resource categories');
    res.json({ message: 'Career resource categories fetched successfully', data: categories });
  } catch (error) {
    logger.error(`Error fetching career resource categories: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /career-resource-categories/:id
 */
export const getCareerResourceCategoryById = async (req, res, next) => {
  try {
    const category = await CareerResourceCategory.findById(req.params.id);
    if (!category) return next(new ErrorClass('Career resource category not found', 404));

    res.json({ data: category });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route PUT /career-resource-categories/:id
 */
export const updateCareerResourceCategoryById = async (req, res, next) => {
  try {
    const oldCategory = await CareerResourceCategory.findById(req.params.id);
    if (!oldCategory) return next(new ErrorClass('Career resource category not found', 404));

    // Validate input
    const { error } = careerResourceCategorySchemaValidation.validate(req.body, { abortEarly: false });
    if (error) return next(new ErrorClass(`Validation error: ${error.message}`, 400));

    const updatedCategory = await CareerResourceCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedCategory) return next(new ErrorClass('Career resource category not found', 404));

    // Update cache if exists
    const cachedCategories = await redisClient.get(CACHE_KEY);
    if (cachedCategories) {
      let categoriesList = JSON.parse(cachedCategories);
      categoriesList = categoriesList.map((category) =>
        category._id === req.params.id ? updatedCategory : category
      );

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(categoriesList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    // Check for significant changes
    const significantChanges = [];
    if (oldCategory.categoryName !== updatedCategory.categoryName) {
      significantChanges.push(`Category name changed from "${oldCategory.categoryName}" to "${updatedCategory.categoryName}"`);
    }

    // Notify admins if there are changes
    if (significantChanges.length > 0) {
      const adminUsers = await userModel.find({ role: 'Admin' });
      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((admin) => admin._id);

        await notificationController.createMultiRecipientNotification(
          adminIds,
          'system',
          'Career Resource Category Updated',
          `The career resource category "${updatedCategory.categoryName}" has been updated: ${significantChanges.join(', ')}.`,
          updatedCategory._id,
          'CareerResourceCategories'
        );
        logger.info(`Notification sent to ${adminUsers.length} admin users about career resource category update`);
      }
    }

    res.json({ message: 'Career resource category updated successfully', data: updatedCategory });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route DELETE /career-resource-categories/:id
 */
export const deleteCareerResourceCategoryById = async (req, res, next) => {
  try {
    const deletedCategory = await CareerResourceCategory.findByIdAndDelete(req.params.id);
    if (!deletedCategory) return next(new ErrorClass('Career resource category not found', 404));

    // Update cache if exists
    const cachedCategories = await redisClient.get(CACHE_KEY);
    if (cachedCategories) {
      let categoriesList = JSON.parse(cachedCategories);
      categoriesList = categoriesList.filter((category) => category._id !== req.params.id);

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(categoriesList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    res.json({ message: 'Career resource category deleted successfully' });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};