import Joi from 'joi';

export const successStorySchemaValidation = Joi.object({
    name: Joi.string().min(3).max(255).required(),
    certificateName: Joi.string().min(3).max(255).required(),
    review: Joi.string().min(5).max(1000).required(),
    date: Joi.date().required(),
    personImage: Joi.string().uri().required()
});
