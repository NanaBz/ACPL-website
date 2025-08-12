const express = require('express');
const router = express.Router();
const Standing = require('../models/Standing');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

// GET all standings with optional sorting
router.get('/', async (req, res) => {
  try {
    const { sortBy, sortOrder } = req.query;
    let sort = {};

    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'name') {
        sort['team.name'] = order; // Sort by populated team's name
      } else {
        sort[sortBy] = order;
      }
    } else {
      // Default sort when no sortBy is provided (e.g., at the start of the season)
      sort.points = -1; // Default sort by points descending
      sort.goalDifference = -1; // Then by goal difference descending
      sort.goalsFor = -1; // Then by goals for descending
      sort['team.name'] = 1; // Lastly, by team name alphabetically
    }

    const standings = await Standing.find()
      .populate('team', 'name code crestUrl')
      .sort(sort);

    res.json(standings);
  } catch (error) {
    logger.error('Error fetching standings:', error);
    res.status(500).json({ message: 'Error fetching standings' });
  }
});

// GET a single standing by ID
router.get('/:id', async (req, res) => {
  try {
    const standing = await Standing.findById(req.params.id)
      .populate('team', 'name code crestUrl');

    if (!standing) {
      return res.status(404).json({ message: 'Standing not found' });
    }

    res.json(standing);
  } catch (error) {
    logger.error('Error fetching standing by ID:', error);
    res.status(500).json({ message: 'Error fetching standing' });
  }
});

// CREATE a new standing (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { team, played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points } = req.body;

    // Basic validation
    if (!team || played === undefined || wins === undefined || draws === undefined || losses === undefined || goalsFor === undefined || goalsAgainst === undefined || goalDifference === undefined || points === undefined) {
      return res.status(400).json({ message: 'All standing fields are required.' });
    }
    // Validate types (simplified for brevity, Mongoose schema helps too)
    if (typeof played !== 'number' || typeof wins !== 'number' || typeof draws !== 'number' || typeof losses !== 'number' || typeof goalsFor !== 'number' || typeof goalsAgainst !== 'number' || typeof goalDifference !== 'number' || typeof points !== 'number') {
      return res.status(400).json({ message: 'Standing fields must be numbers.' });
    }

    const newStanding = new Standing({
      team, played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points
    });

    await newStanding.save();

    res.status(201).json(newStanding);
  } catch (error) {
    logger.error('Error creating standing:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE an existing standing by ID (Admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['team', 'played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'goalDifference', 'points'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }
    // Validate types for updates
    for (let update of updates) {
      if (typeof req.body[update] !== 'number' && update !== 'team') { // 'team' is ObjectId
        return res.status(400).json({ message: `Field ${update} must be a number.` });
      }
    }

    const standing = await Standing.findById(req.params.id);
    if (!standing) {
      return res.status(404).json({ message: 'Standing not found' });
    }

    updates.forEach((update) => standing[update] = req.body[update]);
    await standing.save();

    res.json(standing);
  } catch (error) {
    logger.error('Error updating standing:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a standing by ID (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const standing = await Standing.findByIdAndDelete(req.params.id);

    if (!standing) {
      return res.status(404).json({ message: 'Standing not found' });
    }

    res.json({ message: 'Standing deleted successfully' });
  } catch (error) {
    logger.error('Error deleting standing:', error);
    res.status(500).json({ message: 'Error deleting standing' });
  }
});

module.exports = router; 