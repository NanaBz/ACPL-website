const mongoose = require('mongoose');

const standingSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    unique: true, // Each team should have only one standing entry
  },
  played: {
    type: Number,
    required: true,
    default: 0,
  },
  wins: {
    type: Number,
    required: true,
    default: 0,
  },
  draws: {
    type: Number,
    required: true,
    default: 0,
  },
  losses: {
    type: Number,
    required: true,
    default: 0,
  },
  goalsFor: {
    type: Number,
    required: true,
    default: 0,
  },
  goalsAgainst: {
    type: Number,
    required: true,
    default: 0,
  },
  goalDifference: {
    type: Number,
    required: true,
    default: 0,
  },
  points: {
    type: Number,
    required: true,
    default: 0,
  },
  // You might want to add a 'form' array or similar for recent performance
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
standingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Standing = mongoose.model('Standing', standingSchema);

module.exports = Standing; 