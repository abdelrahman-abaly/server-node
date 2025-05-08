import Joi from 'joi';

export const moduleSchemaValidation = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    duration: Joi.string().min(1).max(100).required(),
    course: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(), // ObjectId
    topics: Joi.array().items(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ).optional()
});
