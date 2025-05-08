import mongoose from 'mongoose';

const careerResourceSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  CareerResourceCategory: {
     type: mongoose.Schema.Types.ObjectId, ref: 'CareerResourceCategory' 
  },
  date: {
    type: Date,
    required: true,
  }
});

const CareerResource = mongoose.model('CareerResource', careerResourceSchema);

export default CareerResource;
