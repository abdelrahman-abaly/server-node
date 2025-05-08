const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  }
});

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  }
});

const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  videos: [videoSchema],        
  assignments: [assignmentSchema], 
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Topic', topicSchema);
