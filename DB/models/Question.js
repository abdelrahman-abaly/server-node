const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  type: { type: String, enum: ['MCQ', 'TrueFalse', 'Discussion'], required: true },
  questionText: { type: String, required: true },
  options: [{ type: String }], 
  correctAnswer: { type: String }, 
  discussionAnswer: { type: String }
}, { timestamps: true });

const Question = mongoose.model('Question', QuestionSchema);
module.exports = Question;
