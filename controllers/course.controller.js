import process from 'node:process';
import dotenv from 'dotenv';
import redisClient from '../config/config-redis.js';
import Course from '../DB/models/course.model.js';
import userModel from '../DB/models/user.model.js';
import { ErrorClass } from '../middlewares/ErrorClass.js';
import logger from '../middlewares/logger.js';
import { courseSchemaValidation } from '../validation/courseValidation.js';
import { notificationController } from './notification.controller.js';

dotenv.config();

export const create = async (req, res, next) => {
  try {
    const { image } = req.body;
    const { error } = courseSchemaValidation.validate(req.body);
    if (error) return next(new ErrorClass(error.message, 500));

    let imagePath;
    if (image) {
      imagePath = image;
    } else if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ error: 'Image is required (file or URL)' });
    }
    req.body.Image = imagePath;
    const newCourse = await Course.create(req.body);
    logger.info('Course created successfully');

    // repopulation on next GET request to be consistent with the new data
    await redisClient.del(process.env.CACHE_KEY);

    // Create a notification for all users about the new course
    const users = await userModel.find({ isDeleted: false, isConfirmed: true });
    if (users && users.length > 0) {
      const userIds = users.map((user) => user._id);
      console.log('Course Model:', Course);
      await notificationController.createMultiRecipientNotification(
        userIds,
        'system',
        'New Course Added',
        `A new course "${newCourse.name}" by ${newCourse.instructor} has been added to our collection.`,
        newCourse._id,
        'Course'
      );
      logger.info(`Notification sent to ${users.length} users about new Course`);
    }

    res.status(201).json({ message: 'Course created successfully', data: newCourse });
  } catch (error) {
    logger.error(`Error creating course: ${error.message}`);
    next(new ErrorClass(error.message, 400));
  }
};

export const getAll = async (req, res, next) => {
  try {
    let { skip, limit, filter } = req.query;
    skip = Number.parseInt(skip);
    limit = Number.parseInt(limit);
    skip = !Number.isNaN(Number.parseInt(skip)) ? Number.parseInt(skip) : 0;
    limit = !Number.isNaN(Number.parseInt(limit)) ? Number.parseInt(limit) : 10;
    filter = filter ? JSON.parse(filter) : {};

    // Check cache first
    const cachedData = await redisClient.get(process.env.CACHE_KEY);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const courses = await Course.find(filter)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'reviews',
        select: 'rating review',
        populate: {
          path: 'user',
          select: 'firstName lastName username email'
        }
      });
    if (!courses.length) return next(new ErrorClass('No courses found', 404));

    // Store result in cache
    await redisClient.setEx(process.env.CACHE_KEY, 3600, JSON.stringify(courses));

    logger.info('Fetching all courses');
    res.json({ message: 'Courses fetched successfully', data: courses });
  } catch (error) {
    logger.error(`Error fetching courses: ${error.message}`);
    next(new ErrorClass(error.message, 500));
  }
};

export const getById = async (req, res, next) => {
  try {
    const course = await Course.findOne({ courseId: req.params.id })
      .populate({
        path: 'reviews',
        select: 'rating review',
        populate: {
          path: 'user',
          select: 'firstName lastName username email'
        }
      });
    if (!course) return next(new ErrorClass('Course not found', 404));

    res.json({ data: course });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

export const updateById = async (req, res, next) => {
  try {
    console.log('BODY:', req.body); // للتأكد من البيانات

    // Store the old course data for comparison
    const oldCourse = await Course.findOne({ courseId: req.params.id });
    if (!oldCourse) return next(new ErrorClass('Course not found', 404));

    const updatedCourse = await Course.findOneAndUpdate({ courseId: req.params.id }, req.body, { new: true });
    if (!updatedCourse) return next(new ErrorClass('Course not found', 404));

    // Update cache if exists
    const cachedCourses = await redisClient.get(process.env.CACHE_KEY);
    if (cachedCourses) {
      let coursesList = JSON.parse(cachedCourses);
      coursesList = coursesList.map((course) => (course.courseId === req.params.id ? updatedCourse : course));

      // Store updated list in cache
      await redisClient.setEx(process.env.CACHE_KEY, 3600, JSON.stringify(coursesList));
    } else {
      // repopulation on next GET request to be consistent with the new data
      await redisClient.del(process.env.CACHE_KEY);
    }

    // Check for significant changes that would warrant a notification
    const significantChanges = [];
    if (oldCourse.name !== updatedCourse.name) {
      significantChanges.push(`Title changed from "${oldCourse.name}" to "${updatedCourse.name}"`);
    }
    if (oldCourse.description !== updatedCourse.description) {
      significantChanges.push(`New Information: "${updatedCourse.description}"`);
    }

    // If there are significant changes, notify users who have this course in their progress
    if (significantChanges.length > 0) {
      // Find admin users to notify about the update
      const adminUsers = await userModel.find({ role: 'Admin' });
      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((admin) => admin._id);
        await notificationController.createMultiRecipientNotification(
          adminIds,
          'system',
          'Course Updated',
          `The course "${updatedCourse.name}" has been updated: ${significantChanges.join(', ')}.`,
          updatedCourse._id,
          'Course'
        );
        logger.info(`Notification sent to ${adminUsers.length} admin users about course update`);
      }
    }

    res.json({ message: 'Course updated successfully', data: updatedCourse });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

export const deleteById = async (req, res, next) => {
  try {
    const deletedCourse = await Course.findOneAndDelete({ courseId: req.params.id });
    if (!deletedCourse) return next(new ErrorClass('Course not found', 404));

    // Update cache if exists
    const cachedCourses = await redisClient.get(process.env.CACHE_KEY);
    if (cachedCourses) {
      let courseList = JSON.parse(cachedCourses);
      courseList = courseList.filter((course) => course.courseId !== req.params.id);

      // Store updated list in cache
      await redisClient.setEx(process.env.CACHE_KEY, 3600, JSON.stringify(courseList));
    } else {
      // repopulation on next GET request to be consistent with the new data
      await redisClient.del(process.env.CACHE_KEY);
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

// Search for courses by name or description
export const searchCourses = async (req, res, next) => {
  try {
    const { search, skip = 0, limit = 10 } = req.query;

    const query = search
      ? { $text: { $search: search } }
      : {}; // لو مفيش search هيجيب كل الكورسات

    const courses = await Course.find(query)
      .sort(search ? { score: { $meta: 'textScore' } } : {}) // ترتيب حسب الصلة
      .select(search ? { score: { $meta: 'textScore' } } : {}) // إضافة نتيجة الصلة في النتيجة (اختياري)
      .skip(Number(skip))
      .limit(Number(limit))
      .populate({
        path: 'reviews',
        select: 'rating review',
        populate: {
          path: 'user',
          select: 'firstName lastName username email'
        }
      });

    if (!courses.length) return res.status(404).json({ message: 'No courses found' });

    res.json({ message: 'Courses found successfully', data: courses });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

// Increment views and enroll user in the course
export const incrementViewsAndEnrollUser = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.user._id;

    const course = await Course.findOneAndUpdate(
      {courseId},
      {$inc: {views: 1}},
      {new: true}
    );

    if (!course) return next(new ErrorClass('Course not found', 404));

    const user = await userModel.findById(userId);
    if (!user) return next(new ErrorClass('User not found', 404));

    // Avoid adding duplicates
    if (!user.courses?.includes(course._id)) {
      user.courses = [...(user.courses || []), course._id];
      await user.save();
    }

    res.status(200).json({
      message: 'View incremented and course added to user',
      data: course
    });
  } catch (error) {
    next(new ErrorClass(error.message, 500));
  }
};

