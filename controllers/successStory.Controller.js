import process from 'node:process';
import dotenv from 'dotenv';
import redisClient from '../config/config-redis.js';
import SuccessStory from '../DB/models/successStory.model.js';
import userModel from '../DB/models/user.model.js';
import { ErrorClass } from '../middlewares/ErrorClass.js';
import logger from '../middlewares/logger.js';
import { notificationController } from './notification.controller.js';
import { successStorySchemaValidation } from '../validation/successStory.validation.js';

dotenv.config();

const CACHE_KEY = process.env.CACHE_SUCCESS_STORY_KEY || 'success_stories_cache';

/**
 * @route POST /success-stories
 */
export const createSuccessStory = async (req, res, next) => {
  try {
    // Validate input
    const { error } = successStorySchemaValidation.validate(req.body);
    if (error) return next(new ErrorClass(error.message, 400));

    let personImagePath;
    if (req.body.personImage) {
      personImagePath = req.body.personImage;
    } else if (req.file) {
      personImagePath = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ error: 'Person image is required (file or URL)' });
    }

    const newStory = await SuccessStory.create({
      ...req.body,
      personImage: personImagePath
    });

    logger.info('Success story created successfully');

    // Clear cache to repopulate on next GET request
    await redisClient.del(CACHE_KEY);

    // Notify all users about the new success story
    const users = await userModel.find({ isDeleted: false, isConfirmed: true });
    if (users && users.length > 0) {
      const userIds = users.map((user) => user._id);

      await notificationController.createMultiRecipientNotification(
        userIds,
        'system',
        'New Success Story Added',
        `A new success story "${newStory.name}" has been added to our collection.`,
        newStory._id,
        'SuccessStories'
      );
      logger.info(`Notification sent to ${users.length} users about new success story`);
    }

    res.status(201).json({ message: 'Success story created successfully', data: newStory });
  } catch (error) {
    logger.error(`Error creating success story: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /success-stories
 */
export const getAllSuccessStories = async (req, res, next) => {
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

    const stories = await SuccessStory.find(filter).skip(skip).limit(limit);
    if (!stories.length) return next(new ErrorClass('No success stories found', 404));

    // Store in cache
    await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(stories));

    logger.info('Fetching all success stories');
    res.json({ message: 'Success stories fetched successfully', data: stories });
  } catch (error) {
    logger.error(`Error fetching success stories: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /success-stories/:id
 */
export const getSuccessStoryById = async (req, res, next) => {
  try {
    const story = await SuccessStory.findById(req.params.id);
    if (!story) return next(new ErrorClass('Success story not found', 404));

    res.json({ data: story });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route PUT /success-stories/:id
 */
export const updateSuccessStoryById = async (req, res, next) => {
  try {
    const oldStory = await SuccessStory.findById(req.params.id);
    if (!oldStory) return next(new ErrorClass('Success story not found', 404));

    // Validate input
    const { error } = successStorySchemaValidation.validate(req.body, { abortEarly: false });
    if (error) return next(new ErrorClass(`Validation error: ${error.message}`, 400));

    const updatedStory = await SuccessStory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedStory) return next(new ErrorClass('Success story not found', 404));

    // Update cache if exists
    const cachedStories = await redisClient.get(CACHE_KEY);
    if (cachedStories) {
      let storiesList = JSON.parse(cachedStories);
      storiesList = storiesList.map((story) =>
        story._id === req.params.id ? updatedStory : story
      );

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(storiesList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    // Check for significant changes
    const significantChanges = [];
    if (oldStory.name !== updatedStory.name) {
      significantChanges.push(`Name changed from "${oldStory.name}" to "${updatedStory.name}"`);
    }
    if (oldStory.review !== updatedStory.review) {
      significantChanges.push(`Review updated: "${updatedStory.review}"`);
    }

    // Notify admins if there are changes
    if (significantChanges.length > 0) {
      const adminUsers = await userModel.find({ role: 'Admin' });
      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((admin) => admin._id);

        await notificationController.createMultiRecipientNotification(
          adminIds,
          'system',
          'Success Story Updated',
          `The success story "${updatedStory.name}" has been updated: ${significantChanges.join(', ')}.`,
          updatedStory._id,
          'SuccessStories'
        );
        logger.info(`Notification sent to ${adminUsers.length} admin users about success story update`);
      }
    }

    res.json({ message: 'Success story updated successfully', data: updatedStory });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route DELETE /success-stories/:id
 */
export const deleteSuccessStoryById = async (req, res, next) => {
  try {
    const deletedStory = await SuccessStory.findByIdAndDelete(req.params.id);
    if (!deletedStory) return next(new ErrorClass('Success story not found', 404));

    // Update cache if exists
    const cachedStories = await redisClient.get(CACHE_KEY);
    if (cachedStories) {
      let storiesList = JSON.parse(cachedStories);
      storiesList = storiesList.filter((story) => story._id !== req.params.id);

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(storiesList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    res.json({ message: 'Success story deleted successfully' });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};