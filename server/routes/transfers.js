const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const redisClient = require('../config/redis');

// GET all transfers with optional filtering and sorting
router.get('/', async (req, res) => {
  try {
    const { sortBy, sortOrder, season, transferType } = req.query;
    let filter = {};
    let sort = { transferDate: -1 }; // Default sort by most recent

    if (season) {
      filter.season = season;
    }
    if (transferType) {
      filter.transferType = transferType;
    }

    if (sortBy) {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'player.name') {
        sort['player.name'] = order; // Sort by populated player's name
      } else if (sortBy === 'fromTeam.name') {
        sort['fromTeam.name'] = order;
      } else if (sortBy === 'toTeam.name') {
        sort['toTeam.name'] = order;
      } else {
        sort[sortBy] = order;
      }
    }

    const cacheKey = `transfers:${JSON.stringify(req.query)}`;
    let cachedTransfers;
    logger.info(`Attempting to get transfers from cache for key: ${cacheKey}`);
    try {
      cachedTransfers = await redisClient.get(cacheKey);
      if (cachedTransfers) {
        logger.info(`Successfully retrieved cached transfers.`);
        return res.json(JSON.parse(cachedTransfers));
      }
    } catch (cacheError) {
      logger.error(`Error parsing cached transfers for key ${cacheKey}:`, cacheError);
      // Fall through to fetch from database if cache parsing fails
    }

    logger.info('Attempting to fetch transfers from database...');
    const transfers = await Transfer.find(filter)
      .populate('player', 'name photoUrl')
      .populate('fromTeam', 'name code crestUrl')
      .populate('toTeam', 'name code crestUrl')
      .sort(sort);
    logger.info(`Successfully fetched ${transfers.length} transfers from database.`);

    logger.info(`Attempting to cache ${transfers.length} transfers for key: ${cacheKey}`);
    await redisClient.setex(cacheKey, 3600, JSON.stringify(transfers)); // Cache for 1 hour
    logger.info(`Successfully cached transfers for key: ${cacheKey}`);

    res.json(transfers);
  } catch (error) {
    logger.error('Error fetching transfers:', error);
    res.status(500).json({ message: 'Error fetching transfers' });
  }
});

// GET a single transfer by ID
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `transfer:${req.params.id}`;
    let cachedTransfer;
    try {
      cachedTransfer = await redisClient.get(cacheKey);
      if (cachedTransfer) {
        logger.info(`Serving transfer from cache for key: ${cacheKey}`);
        return res.json(JSON.parse(cachedTransfer));
      }
    } catch (cacheError) {
      logger.error(`Error parsing cached transfer for key ${cacheKey}:`, cacheError);
      // Fall through to fetch from database if cache parsing fails
    }

    const transfer = await Transfer.findById(req.params.id)
      .populate('player', 'name photoUrl')
      .populate('fromTeam', 'name code crestUrl')
      .populate('toTeam', 'name code crestUrl');

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    await redisClient.setex(cacheKey, 3600, JSON.stringify(transfer)); // Cache for 1 hour
    logger.info(`Cached transfer for key: ${cacheKey}`);

    res.json(transfer);
  } catch (error) {
    logger.error('Error fetching transfer by ID:', error);
    res.status(500).json({ message: 'Error fetching transfer' });
  }
});

// CREATE a new transfer (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { player, fromTeam, toTeam, transferDate, fee, transferType, season } = req.body;

    // Basic validation
    if (!player || !fromTeam || !toTeam || !transferDate || !transferType || !season) {
      return res.status(400).json({ message: 'Player, fromTeam, toTeam, transferDate, transferType, and season are required.' });
    }
    if (!['Permanent', 'Loan', 'Free Transfer', 'End of Loan'].includes(transferType)) {
      return res.status(400).json({ message: 'Invalid transfer type.' });
    }
    if (fee !== undefined && typeof fee !== 'number') {
      return res.status(400).json({ message: 'Fee must be a number.' });
    }

    const newTransfer = new Transfer({
      player, fromTeam, toTeam, transferDate, fee, transferType, season
    });

    await newTransfer.save();
    // Invalidate relevant caches
    await redisClient.del('transfers:*'); // Invalidate all transfers cache
    logger.info('Invalidated transfers cache after new transfer creation');

    const populatedTransfer = await newTransfer
      .populate('player', 'name photoUrl')
      .populate('fromTeam', 'name code crestUrl')
      .populate('toTeam', 'name code crestUrl');

    res.status(201).json(populatedTransfer);
  } catch (error) {
    logger.error('Error creating transfer:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE an existing transfer by ID (Admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['player', 'fromTeam', 'toTeam', 'transferDate', 'fee', 'transferType', 'season'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }

    if (req.body.transferType && !['Permanent', 'Loan', 'Free Transfer', 'End of Loan'].includes(req.body.transferType)) {
      return res.status(400).json({ message: 'Invalid transfer type.' });
    }
    if (req.body.fee !== undefined && typeof req.body.fee !== 'number') {
      return res.status(400).json({ message: 'Fee must be a number.' });
    }

    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    updates.forEach((update) => transfer[update] = req.body[update]);
    await transfer.save();

    // Invalidate relevant caches
    await redisClient.del(`transfer:${req.params.id}`); // Invalidate specific transfer cache
    await redisClient.del('transfers:*'); // Invalidate all transfers cache
    logger.info(`Invalidated transfer cache for ${req.params.id} and all transfers cache after update`);

    const populatedTransfer = await transfer
      .populate('player', 'name photoUrl')
      .populate('fromTeam', 'name code crestUrl')
      .populate('toTeam', 'name code crestUrl');

    res.json(populatedTransfer);
  } catch (error) {
    logger.error('Error updating transfer:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a transfer by ID (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const transfer = await Transfer.findByIdAndDelete(req.params.id);

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }

    // Invalidate relevant caches
    await redisClient.del(`transfer:${req.params.id}`); // Invalidate specific transfer cache
    await redisClient.del('transfers:*'); // Invalidate all transfers cache
    logger.info(`Invalidated transfer cache for ${req.params.id} and all transfers cache after deletion`);

    res.json({ message: 'Transfer deleted successfully' });
  } catch (error) {
    logger.error('Error deleting transfer:', error);
    res.status(500).json({ message: 'Error deleting transfer' });
  }
});

module.exports = router; 