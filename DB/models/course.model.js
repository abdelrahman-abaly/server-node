import mongoose from 'mongoose';
const { Types } = mongoose;
import AutoIncrementFactory from 'mongoose-sequence';

const CourseSchema = new mongoose.Schema({
  courseId: {
    type: Number,
    unique: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true
  },
  name:  {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 255
  },
  categoryID: Number, 
  IfYouLike: String,
  IfYouLikeValue: String,
  SkillsNeeded: String,
  SkillsNeededValue: String,
  logoImage: String,
  organization: String,
  views: {
    type: Number,
    default: 0
  },

  enrolled: {
    type: Number,
    default: 0
  },
  relatedCourses: [
    // Embedded Related Courses
      {
        relatedCourseID: { type: Types.ObjectId, ref: 'Course', required: false },
        name: { type: String }, // Snapshot of name
        Image: { type: String }, 
      }
  ],
  modules: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
    }
  ]
 ,
  description: {
    type: String,
    minLength: 25,
    trim: true,
    maxlength: 500
  },
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    }
  ],
  Image: {
    type: String
  }
}, {timestamps: true});

CourseSchema.index({ name: 'text', description: 'text' });

CourseSchema.set('toJSON', {
  transform: (doc, {__v, ...rest}) => rest
});
const AutoIncrement = AutoIncrementFactory(mongoose);
CourseSchema.plugin(AutoIncrement, {inc_field: 'courseId'});

const Course = mongoose.model('Course', CourseSchema);

export default Course;
