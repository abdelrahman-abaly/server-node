import express from 'express';
import {
  createCareerResourceCategory,
  deleteCareerResourceCategoryById,
  getAllCareerResourceCategories,
  getCareerResourceCategoryById,
  updateCareerResourceCategoryById
} from '../controllers/careerResourceCategory.controller.js';
import { auth, roles } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { asyncHandler } from '../middlewares/ErrorHandling.js';

const careerResourceCategoryRouter = express.Router();

// إنشاء تصنيف جديد لمصادر المسار الوظيفي - متاح فقط للمشرفين
careerResourceCategoryRouter.post(
  '/addCareerResourceCategory',
  auth(),
  authorize(roles.admin),
  asyncHandler(createCareerResourceCategory)
);

// جلب جميع التصنيفات - متاح لجميع المستخدمين المسجلين
careerResourceCategoryRouter.get(
  '/allCareerResourceCategories',
  auth(),
  asyncHandler(getAllCareerResourceCategories)
);

// جلب تصنيف بناءً على ID
careerResourceCategoryRouter.get(
  '/:id',
  auth(),
  asyncHandler(getCareerResourceCategoryById)
);

// تحديث تصنيف بناءً على ID
careerResourceCategoryRouter.patch(
  '/:id',
  auth(),
  authorize(roles.admin),
  asyncHandler(updateCareerResourceCategoryById)
);

// حذف تصنيف بناءً على ID
careerResourceCategoryRouter.delete(
  '/:id',
  auth(),
  authorize(roles.admin),
  asyncHandler(deleteCareerResourceCategoryById)
);

export default careerResourceCategoryRouter;