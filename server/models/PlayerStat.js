const mongoose = require('mongoose');

const playerStatSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    unique: true, // A player should have only one overall stat entry
  },
  goals: {
    type: Number,
    default: 0,
  },
  assists: {
    type: Number,
    default: 0,
  },
  appearances: {
    type: Number,
    default: 0,
  },
  minutesPlayed: {
    type: Number,
    default: 0,
  },
  cleanSheets: {
    type: Number,
    default: 0, // Relevant for defenders/goalkeepers
  },
  yellowCards: {
    type: Number,
    default: 0,
  },
  redCards: {
    type: Number,
    default: 0,
  },
  // Add other relevant stats as needed, e.g., saves, penalties missed, etc.
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
playerStatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PlayerStat = mongoose.model('PlayerStat', playerStatSchema);

module.exports = PlayerStat; 