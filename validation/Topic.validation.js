import Joi from 'joi';

const videoSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    videoUrl: Joi.string().uri().required()
});

const assignmentSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    fileUrl: Joi.string().uri().required()
});

export const topicSchemaValidation = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(1000).optional(),
    videos: Joi.array().items(videoSchema).optional(),
    assignments: Joi.array().items(assignmentSchema).optional(),
    module: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
});
