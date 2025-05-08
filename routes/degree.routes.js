import express from 'express';
import {
  createDegree,
  deleteDegreeById,
  getAllDegrees,
  getDegreeById,
  updateDegreeById
} from '../controllers/degree.controller.js';
import { auth, roles } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { asyncHandler } from '../middlewares/ErrorHandling.js';

const degreeRouter = express.Router();

// إنشاء درجة جديدة - متاح فقط للمشرفين
degreeRouter.post('/addDegree', auth(), authorize(roles.admin), asyncHandler(createDegree));

// جلب كل الدرجات - متاح لجميع المستخدمين المسجلين
degreeRouter.get('/allDegrees', auth(), asyncHandler(getAllDegrees));

// جلب درجة بناءً على ID
degreeRouter.get('/:id', auth(), asyncHandler(getDegreeById));

// تحديث درجة بناءً على ID
degreeRouter.patch('/:id', auth(), authorize(roles.admin), asyncHandler(updateDegreeById));

// حذف درجة بناءً على ID
degreeRouter.delete('/:id', auth(), authorize(roles.admin), asyncHandler(deleteDegreeById));

export default degreeRouter;