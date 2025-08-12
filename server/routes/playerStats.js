const express = require('express');
const router = express.Router();
const PlayerStat = require('../models/PlayerStat');
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const redisClient = require('../config/redis');

// GET all player statistics with optional sorting
router.get('/', async (req, res) => {
  try {
    const { sortBy, sortOrder } = req.query;
    let sort = {};

    if (sortBy) {
      const order = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'player.name') { // Sorting by player name
        sort['player.name'] = order;
      } else {
        sort[sortBy] = order;
      }
    } else {
      sort.goals = -1; // Default sort by goals descending
      sort.assists = -1; // Then by assists descending
      sort.appearances = -1; // Then by appearances descending
      sort['player.name'] = 1; // Lastly, by player name alphabetically
    }

    const cacheKey = `playerStats:${JSON.stringify(req.query)}`;
    const cachedPlayerStats = await redisClient.get(cacheKey);
    if (cachedPlayerStats) {
      logger.info(`Serving player stats from cache for key: ${cacheKey}`);
      return res.json(JSON.parse(cachedPlayerStats));
    }

    const playerStats = await PlayerStat.find()
      .populate({
        path: 'player',
        select: 'name position playerNumber team',
        populate: {
          path: 'team',
          select: 'name code crestUrl',
        }
      })
      .sort(sort);

    await redisClient.setex(cacheKey, 3600, JSON.stringify(playerStats)); // Cache for 1 hour
    logger.info(`Cached player stats for key: ${cacheKey}`);

    res.json(playerStats);
  } catch (error) {
    logger.error('Error fetching player statistics:', error);
    res.status(500).json({ message: 'Error fetching player statistics' });
  }
});

// GET a single player statistic by ID (PlayerStat ID)
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `playerStat:${req.params.id}`;
    const cachedPlayerStat = await redisClient.get(cacheKey);
    if (cachedPlayerStat) {
      logger.info(`Serving player stat from cache for key: ${cacheKey}`);
      return res.json(JSON.parse(cachedPlayerStat));
    }

    const playerStat = await PlayerStat.findById(req.params.id)
      .populate({
        path: 'player',
        select: 'name position playerNumber team',
        populate: {
          path: 'team',
          select: 'name code crestUrl',
        }
      });

    if (!playerStat) {
      return res.status(404).json({ message: 'Player statistic not found' });
    }

    await redisClient.setex(cacheKey, 3600, JSON.stringify(playerStat)); // Cache for 1 hour
    logger.info(`Cached player stat for key: ${cacheKey}`);

    res.json(playerStat);
  } catch (error) {
    logger.error('Error fetching player statistic by ID:', error);
    res.status(500).json({ message: 'Error fetching player statistic' });
  }
});

// CREATE a new player statistic (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { player, goals, assists, appearances, minutesPlayed, cleanSheets, yellowCards, redCards } = req.body;

    // Basic validation
    if (!player) {
      return res.status(400).json({ message: 'Player ID is required.' });
    }

    const newPlayerStat = new PlayerStat({
      player, goals, assists, appearances, minutesPlayed, cleanSheets, yellowCards, redCards
    });

    await newPlayerStat.save();
    // Invalidate relevant caches
    await redisClient.del('playerStats:*'); // Invalidate all player stats cache
    logger.info('Invalidated player stats cache after new stat creation');

    res.status(201).json(newPlayerStat);
  } catch (error) {
    logger.error('Error creating player statistic:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE an existing player statistic by ID (Admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['goals', 'assists', 'appearances', 'minutesPlayed', 'cleanSheets', 'yellowCards', 'redCards'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }

    const playerStat = await PlayerStat.findById(req.params.id);
    if (!playerStat) {
      return res.status(404).json({ message: 'Player statistic not found' });
    }

    updates.forEach((update) => playerStat[update] = req.body[update]);
    await playerStat.save();

    // Invalidate relevant caches
    await redisClient.del(`playerStat:${req.params.id}`); // Invalidate specific player stat cache
    await redisClient.del('playerStats:*'); // Invalidate all player stats cache
    logger.info(`Invalidated player stat cache for ${req.params.id} and all player stats cache after update`);

    res.json(playerStat);
  } catch (error) {
    logger.error('Error updating player statistic:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a player statistic by ID (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const playerStat = await PlayerStat.findByIdAndDelete(req.params.id);

    if (!playerStat) {
      return res.status(404).json({ message: 'Player statistic not found' });
    }

    // Invalidate relevant caches
    await redisClient.del(`playerStat:${req.params.id}`); // Invalidate specific player stat cache
    await redisClient.del('playerStats:*'); // Invalidate all player stats cache
    logger.info(`Invalidated player stat cache for ${req.params.id} and all player stats cache after deletion`);

    res.json({ message: 'Player statistic deleted successfully' });
  } catch (error) {
    logger.error('Error deleting player statistic:', error);
    res.status(500).json({ message: 'Error deleting player statistic' });
  }
});

module.exports = router; 