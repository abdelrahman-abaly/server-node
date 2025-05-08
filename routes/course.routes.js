import express from 'express';
import {
  create,
  deleteById,
  getAll,
  getById,
  updateById,
  searchCourses,
  incrementViewsAndEnrollUser
} from '../controllers/course.controller.js';
import {auth, roles} from '../middlewares/auth.js';
import {authorize} from '../middlewares/authorize.js';
import {asyncHandler} from '../middlewares/ErrorHandling.js';
import {upload} from '../middlewares/multer.middleware.js';

const courseRouter = express.Router();

courseRouter.post('/addCourse', auth(), authorize(roles.admin), upload.single('image'), asyncHandler(create));
courseRouter.get('/allCourse', auth(), authorize(roles.admin), asyncHandler(getAll));
courseRouter.get('/search', auth(), asyncHandler(searchCourses));
courseRouter.patch('/view/:id', auth(), asyncHandler(incrementViewsAndEnrollUser));
courseRouter.get('/:id', auth(), asyncHandler(getById));
courseRouter.patch('/:id', auth(), authorize(roles.admin),upload.none(), asyncHandler(updateById));
courseRouter.delete('/:id', auth(), authorize(roles.admin), asyncHandler(deleteById));

export default courseRouter;
