const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  position: {
    type: String,
    required: true,
    enum: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'] // Restrict to specific positions
  },
  playerNumber: {
    type: Number
  },
  photoUrl: {
    type: String
  }
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player; 