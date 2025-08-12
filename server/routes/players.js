const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const auth = require('../middleware/auth'); // Assuming auth middleware is in ../middleware/auth.js
const logger = require('../config/logger'); // Import the logger
const redisClient = require('../config/redis'); // Import Redis client

// GET all players with optional filtering and sorting
router.get('/', async (req, res) => {
  try {
    const { position, team, sortBy, sortOrder } = req.query;
    
    // Create a unique cache key based on query parameters
    const cacheKey = `players:${JSON.stringify(req.query)}`;

    // Try to fetch from cache first
    const cachedPlayers = await redisClient.get(cacheKey);
    if (cachedPlayers) {
      logger.info(`Serving players from cache for key: ${cacheKey}`);
      return res.json(JSON.parse(cachedPlayers));
    }

    let query = {};
    let sort = {};

    if (position) {
      query.position = position;
    }

    if (team) {
      // Find the team ID from the team name (assuming Team model exists and is linked)
      // This might require populating team and then filtering, or a separate lookup
      // For now, let's assume 'team' in player model is the team's name or ID directly
      query.team = team;
    }

    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      sort[sortBy] = order;
    } else {
      // Default sort
      sort.name = 1; // Default sort by name ascending
    }

    const players = await Player.find(query)
      .populate('team', 'name code')
      .sort(sort);

    // Cache the result for 1 hour (3600 seconds)
    await redisClient.setex(cacheKey, 3600, JSON.stringify(players));
    logger.info(`Cached players for key: ${cacheKey}`);

    res.json(players);
  } catch (error) {
    logger.error('Error fetching players:', error);
    res.status(500).json({ message: 'Error fetching players' });
  }
});

// GET a single player by ID
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'name code');
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    logger.error('Error fetching player by ID:', error);
    res.status(500).json({ message: 'Error fetching player' });
  }
});

// GET players by team ID
router.get('/team/:teamId', async (req, res) => {
  try {
    const players = await Player.find({ team: req.params.teamId }).populate('team', 'name code');
    res.json(players);
  } catch (error) {
    logger.error('Error fetching players by team ID:', error);
    res.status(500).json({ message: 'Error fetching players for team' });
  }
});

// CREATE a new player (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    // In a real application, you would also check if the authenticated user is an admin
    const { name, team, position, playerNumber, photoUrl } = req.body;

    // Basic validation for required fields
    if (!name || !team || !position) {
      return res.status(400).json({ message: 'Name, team, and position are required fields.' });
    }

    // Optional: Validate position enum if you have one
    const validPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']; // Example positions
    if (!validPositions.includes(position)) {
      return res.status(400).json({ message: 'Invalid player position.' });
    }

    // Optional: Validate playerNumber is a number if provided
    if (playerNumber !== undefined && typeof playerNumber !== 'number') {
      return res.status(400).json({ message: 'Player number must be a number.' });
    }

    const newPlayer = new Player({
      name,
      team,
      position,
      playerNumber,
      photoUrl
    });

    await newPlayer.save();
    // Populate the team details before sending the response back
    const populatedPlayer = await newPlayer.populate('team', 'name code');
    res.status(201).json(populatedPlayer);
  } catch (error) {
    logger.error('Error creating player:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE an existing player by ID (Admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
     // In a real application, you would also check if the authenticated user is an admin
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'team', 'position', 'playerNumber', 'photoUrl'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates! Only name, team, position, playerNumber, photoUrl are allowed.' });
    }

    // Specific validation for updated fields
    if (req.body.position && !validPositions.includes(req.body.position)) {
      return res.status(400).json({ message: 'Invalid player position.' });
    }

    if (req.body.playerNumber !== undefined && typeof req.body.playerNumber !== 'number') {
      return res.status(400).json({ message: 'Player number must be a number.' });
    }

    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    updates.forEach((update) => player[update] = req.body[update]);
    await player.save();
    
    // Populate the team details before sending the response back
    const populatedPlayer = await player.populate('team', 'name code');

    res.json(populatedPlayer);
  } catch (error) {
    logger.error('Error updating player:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a player by ID (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
     // In a real application, you would also check if the authenticated user is an admin
    const player = await Player.findByIdAndDelete(req.params.id);

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    logger.error('Error deleting player:', error);
    res.status(500).json({ message: 'Error deleting player' });
  }
});

module.exports = router; 