import Joi from 'joi';

export const degreeSchemaValidation = Joi.object({
    name: Joi.string().min(3).max(255).required(),
    degree: Joi.string().min(2).max(255).required(),
    description: Joi.string().min(10).max(1000).required(),
    duration: Joi.string().min(1).max(100).required(),
    level: Joi.string().min(1).max(100).required(),
    subject: Joi.string().min(1).max(255).required(),
    link: Joi.string().uri().required(),
    img: Joi.string().uri().required()
});
