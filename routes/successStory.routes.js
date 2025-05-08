import express from 'express';
import {
    createSuccessStory,
    deleteSuccessStoryById,
    getAllSuccessStories,
    getSuccessStoryById,
    updateSuccessStoryById
} from '../controllers/successStory.Controller.js';
import { auth, roles } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { asyncHandler } from '../middlewares/ErrorHandling.js';

const successStoryRouter = express.Router();

successStoryRouter.post('/addsuccessStory', auth(), authorize(roles.admin), asyncHandler(createSuccessStory));

successStoryRouter.get('/allsuccessStories', auth(), asyncHandler(getAllSuccessStories));

successStoryRouter.get('/:id', auth(), asyncHandler(getSuccessStoryById));

successStoryRouter.patch('/:id', auth(), authorize(roles.admin), asyncHandler(updateSuccessStoryById));

successStoryRouter.delete('/:id', auth(), authorize(roles.admin), asyncHandler(deleteSuccessStoryById));

export default successStoryRouter;  