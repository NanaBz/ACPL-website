const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  crestUrl: {
    type: String
  },
  jerseyUrl: {
    type: String
  },
  founded: {
    type: Number
  }
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team; 