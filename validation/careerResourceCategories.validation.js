import Joi from 'joi';

export const careerResourceCategorySchemaValidation = Joi.object({
    categoryName: Joi.string().min(3).max(255).required()
});
