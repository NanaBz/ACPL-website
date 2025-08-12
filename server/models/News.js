const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['transfer', 'milestone', 'highlight', 'general', 'injury', 'match_report'], // Define possible news types
  },
  // Optional fields for linking to players or teams
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: false,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: false,
  },
  imageUrl: {
    type: String,
    trim: true,
    // Optional URL for a news image
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update 'updatedAt' field on save
newsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const News = mongoose.model('News', newsSchema);

module.exports = News; 