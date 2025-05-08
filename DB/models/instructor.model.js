import mongoose from 'mongoose';

const instructorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  Name: { type: String, required: true },
  Image: { type: String },
  job: { type: String },
  coursesTitle: [{ type: String }],
  SocialMedia: {
    LinkidIn: { type: String }

  },
  description: { type: String },
  courses: [
      {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
          required: true
        },
  ]
}, {
  timestamps: true
});

const Instructor = mongoose.model('Instructor', instructorSchema);

export default Instructor;
