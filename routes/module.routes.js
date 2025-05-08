import express from 'express';
import {
  createModule,
  deleteModuleById,
  getAllModules,
  getModuleById,
  updateModuleById
} from '../controllers/module.Controller.js';
import { auth, roles } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { asyncHandler } from '../middlewares/ErrorHandling.js';

const moduleRouter = express.Router();

// إنشاء وحدة جديدة - متاح فقط للمشرفين
moduleRouter.post(
  '/addModule',
  auth(),
  authorize(roles.admin),
  asyncHandler(createModule)
);

// جلب جميع الوحدات - متاح لجميع المستخدمين المسجلين
moduleRouter.get(
  '/allModules',
  auth(),
  asyncHandler(getAllModules)
);

// جلب وحدة بناءً على ID
moduleRouter.get(
  '/:id',
  auth(),
  asyncHandler(getModuleById)
);

// تحديث وحدة بناءً على ID
moduleRouter.patch(
  '/:id',
  auth(),
  authorize(roles.admin),
  asyncHandler(updateModuleById)
);

// حذف وحدة بناءً على ID
moduleRouter.delete(
  '/:id',
  auth(),
  authorize(roles.admin),
  asyncHandler(deleteModuleById)
);

export default moduleRouter;