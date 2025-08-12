const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const auth = require('../middleware/auth'); // Assuming auth middleware is in ../middleware/auth.js
const logger = require('../config/logger'); // Import the logger

// GET all teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) {
    logger.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Error fetching teams' });
  }
});

// GET a single team by ID
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    logger.error('Error fetching team by ID:', error);
    res.status(500).json({ message: 'Error fetching team' });
  }
});

// CREATE a new team (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    // In a real application, you would also check if the authenticated user is an admin
    const { name, code, crestUrl, jerseyUrl, founded } = req.body;

    // Basic validation for required fields
    if (!name || !code) {
      return res.status(400).json({ message: 'Team name and code are required fields.' });
    }

    // Optional: Validate founded is a number if provided
    if (founded !== undefined && typeof founded !== 'number') {
      return res.status(400).json({ message: 'Founded year must be a number.' });
    }

    const newTeam = new Team({
      name,
      code,
      crestUrl,
      jerseyUrl,
      founded
    });

    await newTeam.save();
    res.status(201).json(newTeam);
  } catch (error) {
    logger.error('Error creating team:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE an existing team by ID (Admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
     // In a real application, you would also check if the authenticated user is an admin
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'code', 'crestUrl', 'jerseyUrl', 'founded'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates! Only name, code, crestUrl, jerseyUrl, founded are allowed.' });
    }

    // Specific validation for updated fields
    if (req.body.founded !== undefined && typeof req.body.founded !== 'number') {
      return res.status(400).json({ message: 'Founded year must be a number.' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    updates.forEach((update) => team[update] = req.body[update]);
    await team.save();

    res.json(team);
  } catch (error) {
    logger.error('Error updating team:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a team by ID (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
     // In a real application, you would also check if the authenticated user is an admin
    const team = await Team.findByIdAndDelete(req.params.id);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    logger.error('Error deleting team:', error);
    res.status(500).json({ message: 'Error deleting team' });
  }
});

module.exports = router; 