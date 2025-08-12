const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  fromTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  toTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  transferDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  fee: {
    type: Number, // Stored in millions, e.g., 20.5 for 20.5 million
    required: false, // Not all transfers have a fee (e.g., free transfers)
  },
  transferType: {
    type: String,
    required: true,
    enum: ['Permanent', 'Loan', 'Free Transfer', 'End of Loan'], // Define possible transfer types
  },
  season: {
    type: String,
    required: true,
    trim: true,
    // Example: "2023/2024"
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
transferSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Transfer = mongoose.model('Transfer', transferSchema);

module.exports = Transfer; 