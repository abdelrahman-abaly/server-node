const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: String, required: true }, 
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  topics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
}, { timestamps: true });

const Module = mongoose.model('Module', ModuleSchema);
module.exports = Module;
