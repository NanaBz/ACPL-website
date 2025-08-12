const express = require('express');
const router = express.Router();
const Fixture = require('../models/Fixture');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

// GET all fixtures with optional filtering and sorting
// This will be used for the public fixtures list page
router.get('/', async (req, res) => {
  try {
    const { matchweek, teamId, sortBy, sortOrder } = req.query;
    let query = {};
    let sort = {};

    if (matchweek) {
      query.matchweek = parseInt(matchweek);
    }
    if (teamId) {
      query.$or = [{ 'teamA.teamId': teamId }, { 'teamB.teamId': teamId }];
    }

    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      sort[sortBy] = order;
    } else {
      sort.date = 1; // Default sort by date ascending
      sort.time = 1; // Then by time
    }

    const fixtures = await Fixture.find(query)
      .populate('teamA.teamId', 'name code crestUrl')
      .populate('teamB.teamId', 'name code crestUrl')
      .sort(sort);

    res.json(fixtures);
  } catch (error) {
    logger.error('Error fetching fixtures:', error);
    res.status(500).json({ message: 'Error fetching fixtures' });
  }
});

// GET a single fixture by ID (to display teamsheets)
router.get('/:id', async (req, res) => {
  try {
    const fixture = await Fixture.findById(req.params.id)
      .populate('teamA.teamId', 'name code crestUrl')
      .populate('teamB.teamId', 'name code crestUrl')
      .populate('teamsheets.players.playerId', 'name position team');

    if (!fixture) {
      return res.status(404).json({ message: 'Fixture not found' });
    }

    res.json(fixture);
  } catch (error) {
    logger.error('Error fetching fixture by ID:', error);
    res.status(500).json({ message: 'Error fetching fixture' });
  }
});

// CREATE a new fixture (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { matchweek, date, time, venue, teamA, teamB, status, teamsheets } = req.body;

    // Basic validation
    if (!matchweek || !date || !time || !venue || !teamA || !teamB) {
      return res.status(400).json({ message: 'Matchweek, date, time, venue, Team A, and Team B are required.' });
    }
    
    const newFixture = new Fixture({
      matchweek, date, time, venue, teamA, teamB, status, teamsheets
    });

    await newFixture.save();

    res.status(201).json(newFixture);
  } catch (error) {
    logger.error('Error creating fixture:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE an existing fixture by ID (Admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['matchweek', 'date', 'time', 'venue', 'teamA', 'teamB', 'status', 'teamsheets'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }

    const fixture = await Fixture.findById(req.params.id);
    if (!fixture) {
      return res.status(404).json({ message: 'Fixture not found' });
    }

    updates.forEach((update) => fixture[update] = req.body[update]);
    await fixture.save();

    res.json(fixture);
  } catch (error) {
    logger.error('Error updating fixture:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a fixture by ID (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const fixture = await Fixture.findByIdAndDelete(req.params.id);

    if (!fixture) {
      return res.status(404).json({ message: 'Fixture not found' });
    }

    res.json({ message: 'Fixture deleted successfully' });
  } catch (error) {
    logger.error('Error deleting fixture:', error);
    res.status(500).json({ message: 'Error deleting fixture' });
  }
});

module.exports = router; 