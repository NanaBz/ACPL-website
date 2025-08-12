const mongoose = require('mongoose');

const teamSheetPlayerSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  role: { type: String, enum: ['Starter', 'Substitute'], required: true },
  // Add any other player-specific fields for the teamsheet, e.g., captaincy, goals
});

const teamSheetSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  players: [teamSheetPlayerSchema],
});

const fixtureSchema = new mongoose.Schema({
  matchweek: {
    type: Number,
    required: true,
    min: 1,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  venue: {
    type: String,
    required: true,
  },
  teamA: {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    score: { type: Number, default: 0 },
  },
  teamB: {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    score: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Live', 'Completed', 'Postponed', 'Cancelled'],
    default: 'Upcoming',
  },
  teamsheets: {
    type: [teamSheetSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Fixture = mongoose.model('Fixture', fixtureSchema);

module.exports = Fixture; 