import Joi from 'joi';

export const careerResourceSchemaValidation = Joi.object({
    question: Joi.string().min(5).max(1000).required(),
    answer: Joi.string().min(5).max(5000).required(),
    CareerResourceCategory: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(), // ObjectId
    date: Joi.date().required()
});
