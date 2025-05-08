import Joi from 'joi';

export const instructorSchemaValidation = Joi.object({
    id: Joi.string().required(),
    Name: Joi.string().min(3).max(255).required(),
    Image: Joi.string().uri().optional(),
    job: Joi.string().max(255).optional(),
    coursesTitle: Joi.array().items(Joi.string()).optional(),
    SocialMedia: Joi.object({
        LinkidIn: Joi.string().uri().optional()
    }).optional(),
    description: Joi.string().max(1000).optional(),
    courses: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional()
});
