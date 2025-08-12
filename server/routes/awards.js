const express = require('express');
const router = express.Router();
const Award = require('../models/Award');
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const redisClient = require('../config/redis');

// GET all awards with optional filtering and sorting
router.get('/', async (req, res) => {
  try {
    const { sortBy, sortOrder, season, recipient } = req.query;
    let filter = {};
    let sort = { dateAwarded: -1 }; // Default sort by most recent

    if (season) {
      filter.season = season;
    }
    if (recipient) {
      filter.recipient = recipient;
    }

    if (sortBy) {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'recipient.name') {
        sort['recipient.name'] = order; // Sort by populated recipient's name
      } else {
        sort[sortBy] = order;
      }
    }

    const cacheKey = `awards:${JSON.stringify(req.query)}`;
    let cachedAwards;
    try {
      cachedAwards = await redisClient.get(cacheKey);
      if (cachedAwards) {
        logger.info(`Serving awards from cache for key: ${cacheKey}`);
        return res.json(JSON.parse(cachedAwards));
      }
    } catch (cacheError) {
      logger.error(`Error parsing cached awards for key ${cacheKey}:`, cacheError);
      // Fall through to fetch from database if cache parsing fails
    }

    logger.info('Attempting to fetch awards from database...');
    const awards = await Award.find(filter)
      .populate({
        path: 'recipient',
        select: 'name position playerNumber team',
        populate: {
          path: 'team',
          select: 'name code crestUrl',
        }
      })
      .sort(sort);
    logger.info(`Successfully fetched ${awards.length} awards from database.`);

    await redisClient.setex(cacheKey, 3600, JSON.stringify(awards)); // Cache for 1 hour
    logger.info(`Cached awards for key: ${cacheKey}`);

    res.json(awards);
  } catch (error) {
    logger.error('Error fetching awards:', error);
    res.status(500).json({ message: 'Error fetching awards' });
  }
});

// GET a single award by ID
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `award:${req.params.id}`;
    const cachedAward = await redisClient.get(cacheKey);
    if (cachedAward) {
      logger.info(`Serving award from cache for key: ${cacheKey}`);
      return res.json(JSON.parse(cachedAward));
    }

    const award = await Award.findById(req.params.id)
      .populate({
        path: 'recipient',
        select: 'name position playerNumber team',
        populate: {
          path: 'team',
          select: 'name code crestUrl',
        }
      });

    if (!award) {
      return res.status(404).json({ message: 'Award not found' });
    }

    await redisClient.setex(cacheKey, 3600, JSON.stringify(award)); // Cache for 1 hour
    logger.info(`Cached award for key: ${cacheKey}`);

    res.json(award);
  } catch (error) {
    logger.error('Error fetching award by ID:', error);
    res.status(500).json({ message: 'Error fetching award' });
  }
});

// CREATE a new award (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, recipient, season, imageUrl } = req.body;

    // Basic validation
    if (!title || !season) {
      return res.status(400).json({ message: 'Award title and season are required.' });
    }

    const newAward = new Award({
      title, description, recipient, season, imageUrl
    });

    await newAward.save();
    // Invalidate relevant caches
    await redisClient.del('awards:*'); // Invalidate all awards cache
    logger.info('Invalidated awards cache after new award creation');

    res.status(201).json(newAward);
  } catch (error) {
    logger.error('Error creating award:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE an existing award by ID (Admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'description', 'recipient', 'season', 'dateAwarded', 'imageUrl'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }

    const award = await Award.findById(req.params.id);
    if (!award) {
      return res.status(404).json({ message: 'Award not found' });
    }

    updates.forEach((update) => award[update] = req.body[update]);
    await award.save();

    // Invalidate relevant caches
    await redisClient.del(`award:${req.params.id}`); // Invalidate specific award cache
    await redisClient.del('awards:*'); // Invalidate all awards cache
    logger.info(`Invalidated award cache for ${req.params.id} and all awards cache after update`);

    res.json(award);
  } catch (error) {
    logger.error('Error updating award:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE an award by ID (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const award = await Award.findByIdAndDelete(req.params.id);

    if (!award) {
      return res.status(404).json({ message: 'Award not found' });
    }

    // Invalidate relevant caches
    await redisClient.del(`award:${req.params.id}`); // Invalidate specific award cache
    await redisClient.del('awards:*'); // Invalidate all awards cache
    logger.info(`Invalidated award cache for ${req.params.id} and all awards cache after deletion`);

    res.json({ message: 'Award deleted successfully' });
  } catch (error) {
    logger.error('Error deleting award:', error);
    res.status(500).json({ message: 'Error deleting award' });
  }
});

module.exports = router; 