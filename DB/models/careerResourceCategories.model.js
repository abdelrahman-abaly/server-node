import mongoose from 'mongoose';

const careerResourceCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
  },
});

const CareerResourceCategory = mongoose.model('CareerResourceCategory', careerResourceCategorySchema);

export default CareerResourceCategory;
