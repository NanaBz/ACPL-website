const mongoose = require('mongoose');

const awardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    // This could be optional if some awards are not player-specific (e.g., Team of the Season)
    // For now, let's keep it required, can adjust later if needed.
    required: false,
  },
  season: {
    type: String,
    required: true,
    trim: true,
    // Example: "2023/2024"
  },
  matchweek: {
    type: Number,
    required: false, // Not all awards might be matchweek-specific (e.g., end of season awards)
  },
  dateAwarded: {
    type: Date,
    default: Date.now,
  },
  imageUrl: {
    type: String,
    trim: true,
    // Optional URL for an award trophy image
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
awardSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Award = mongoose.model('Award', awardSchema);

module.exports = Award; 