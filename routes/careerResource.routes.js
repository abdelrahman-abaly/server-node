import express from 'express';
import {
  createCareerResource,
  deleteCareerResourceById,
  getAllCareerResources,
  getCareerResourceById,
  updateCareerResourceById
} from '../controllers/careerResource.controller.js';
import { auth, roles } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { asyncHandler } from '../middlewares/ErrorHandling.js';

const careerResourceRouter = express.Router();

// إنشاء مصدر جديد للمسار الوظيفي - متاح فقط للمشرفين
careerResourceRouter.post(
  '/addCareerResource',
  auth(),
  authorize(roles.admin),
  asyncHandler(createCareerResource)
);

// جلب جميع مصادر المسارات الوظيفية - متاح لجميع المستخدمين المسجلين
careerResourceRouter.get(
  '/allCareerResources',
  auth(),
  asyncHandler(getAllCareerResources)
);

// جلب مصدر مسار وظيفي بناءً على ID
careerResourceRouter.get(
  '/:id',
  auth(),
  asyncHandler(getCareerResourceById)
);

// تحديث مصدر مسار وظيفي بناءً على ID
careerResourceRouter.patch(
  '/:id',
  auth(),
  authorize(roles.admin),
  asyncHandler(updateCareerResourceById)
);

// حذف مصدر مسار وظيفي بناءً على ID
careerResourceRouter.delete(
  '/:id',
  auth(),
  authorize(roles.admin),
  asyncHandler(deleteCareerResourceById)
);

export default careerResourceRouter;