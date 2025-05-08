import express from 'express';
import {
    createInstructor,
    getAllInstructors,
    getInstructorById,
    updateInstructor,
    deleteInstructor
} from '../controllers/instructor.Controller.js';
import { auth, roles } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { asyncHandler } from '../middlewares/ErrorHandling.js';
import { upload } from '../middlewares/multer.middleware.js';

const instructorRouter = express.Router();

instructorRouter.post('/addinstructor', auth(), authorize(roles.admin), upload.single('image'), asyncHandler(createInstructor));
instructorRouter.get('/allInstructor', auth(), authorize(roles.admin), asyncHandler(getAllInstructors));
instructorRouter.get('/:id', auth(), asyncHandler(getInstructorById));
instructorRouter.patch('/:id', auth(), authorize(roles.admin), asyncHandler(updateInstructor));
instructorRouter.delete('/:id', auth(), authorize(roles.admin), asyncHandler(deleteInstructor));

export default instructorRouter;
