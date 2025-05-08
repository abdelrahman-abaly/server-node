import mongoose from 'mongoose';

const successStorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  certificateName: {
    type: String,
    required: true,
  },
  review: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  personImage: {
    type: String,
    required: true,
  }
});

const SuccessStory = mongoose.model('SuccessStory', successStorySchema);

export default SuccessStory;
