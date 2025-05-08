import Joi from 'joi';

export const courseSchemaValidation = Joi.object({
  instructor: Joi.string().required(),
  name: Joi.string().min(3).max(255).required(),
  categoryID: Joi.number().optional(),
  IfYouLike: Joi.string().optional(),
  IfYouLikeValue: Joi.string().optional(),
  SkillsNeeded: Joi.string().optional(),
  SkillsNeededValue: Joi.string().optional(),
  logoImage: Joi.string().optional(),
  organization: Joi.string().optional(),
  views: Joi.number().optional(),
  enrolled: Joi.number().optional(),
  relatedCourses: Joi.array().items(
    Joi.object({
      relatedCourseID: Joi.string().required(),
      name: Joi.string().optional(),
      Image: Joi.string().optional()
    })
  ).optional(),
  modules: Joi.array().items(Joi.string()).optional(),
  description: Joi.string().min(25).max(500).optional(),
  reviews: Joi.array().items(Joi.string()).optional(),
  Image: Joi.string().optional()
});
