import process from 'node:process';
import dotenv from 'dotenv';
import redisClient from '../config/config-redis.js';
import Topic from '../DB/models/Topic.model.js';
import Module from '../DB/models/module.model.js';
import userModel from '../DB/models/user.model.js';
import { ErrorClass } from '../middlewares/ErrorClass.js';
import logger from '../middlewares/logger.js';
import { notificationController } from './notification.controller.js';
import { topicSchemaValidation } from '../validation/topicValidation.js';

dotenv.config();

const CACHE_KEY = process.env.CACHE_TOPIC_KEY || 'topics_cache';

/**
 * @route POST /topics
 */
export const createTopic = async (req, res, next) => {
  try {
    // Validate input
    const { error } = topicSchemaValidation.validate(req.body);
    if (error) return next(new ErrorClass(error.message, 400));

    const newTopic = await Topic.create(req.body);

    logger.info('Topic created successfully');

    // Clear cache to repopulate on next GET request
    await redisClient.del(CACHE_KEY);

    // Notify all users about the new topic
    const users = await userModel.find({ isDeleted: false, isConfirmed: true });
    if (users && users.length > 0) {
      const userIds = users.map((user) => user._id);

      await notificationController.createMultiRecipientNotification(
        userIds,
        'system',
        'New Topic Added',
        `A new topic "${newTopic.title}" has been added to our collection.`,
        newTopic._id,
        'Topics'
      );
      logger.info(`Notification sent to ${users.length} users about new topic`);
    }

    res.status(201).json({ message: 'Topic created successfully', data: newTopic });
  } catch (error) {
    logger.error(`Error creating topic: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /topics
 */
export const getAllTopics = async (req, res, next) => {
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

    const topics = await Topic.find(filter)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'module',
        select: 'title course'
      });

    if (!topics.length) return next(new ErrorClass('No topics found', 404));

    // Store in cache
    await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(topics));

    logger.info('Fetching all topics');
    res.json({ message: 'Topics fetched successfully', data: topics });
  } catch (error) {
    logger.error(`Error fetching topics: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route GET /topics/:id
 */
export const getTopicById = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id)
      .populate({
        path: 'module',
        select: 'title course'
      });

    if (!topic) return next(new ErrorClass('Topic not found', 404));

    res.json({ data: topic });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route PUT /topics/:id
 */
export const updateTopicById = async (req, res, next) => {
  try {
    const oldTopic = await Topic.findById(req.params.id);
    if (!oldTopic) return next(new ErrorClass('Topic not found', 404));

    // Validate input
    const { error } = topicSchemaValidation.validate(req.body, { abortEarly: false });
    if (error) return next(new ErrorClass(`Validation error: ${error.message}`, 400));

    const updatedTopic = await Topic.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedTopic) return next(new ErrorClass('Topic not found', 404));

    // Update cache if exists
    const cachedTopics = await redisClient.get(CACHE_KEY);
    if (cachedTopics) {
      let topicsList = JSON.parse(cachedTopics);
      topicsList = topicsList.map((topic) =>
        topic._id === req.params.id ? updatedTopic : topic
      );

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(topicsList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    // Check for significant changes
    const significantChanges = [];
    if (oldTopic.title !== updatedTopic.title) {
      significantChanges.push(`Title changed from "${oldTopic.title}" to "${updatedTopic.title}"`);
    }
    if (oldTopic.description !== updatedTopic.description) {
      significantChanges.push(`Description updated.`);
    }

    // Notify admins if there are changes
    if (significantChanges.length > 0) {
      const adminUsers = await userModel.find({ role: 'Admin' });
      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((admin) => admin._id);

        await notificationController.createMultiRecipientNotification(
          adminIds,
          'system',
          'Topic Updated',
          `The topic "${updatedTopic.title}" has been updated: ${significantChanges.join(', ')}.`,
          updatedTopic._id,
          'Topics'
        );
        logger.info(`Notification sent to ${adminUsers.length} admin users about topic update`);
      }
    }

    res.json({ message: 'Topic updated successfully', data: updatedTopic });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

/**
 * @route DELETE /topics/:id
 */
export const deleteTopicById = async (req, res, next) => {
  try {
    const deletedTopic = await Topic.findByIdAndDelete(req.params.id);
    if (!deletedTopic) return next(new ErrorClass('Topic not found', 404));

    // Update cache if exists
    const cachedTopics = await redisClient.get(CACHE_KEY);
    if (cachedTopics) {
      let topicsList = JSON.parse(cachedTopics);
      topicsList = topicsList.filter((topic) => topic._id !== req.params.id);

      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(topicsList));
    } else {
      await redisClient.del(CACHE_KEY);
    }

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};