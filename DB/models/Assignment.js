const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
}, { timestamps: true });

const Assignment = mongoose.model('Assignment', AssignmentSchema);
module.exports = Assignment;

