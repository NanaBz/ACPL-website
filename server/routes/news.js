const express = require('express');
const router = express.Router();
const News = require('../models/News');
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const redisClient = require('../config/redis');

// GET all news articles with optional filtering and sorting
router.get('/', async (req, res) => {
  try {
    const { sortBy, sortOrder, type, player, team } = req.query;
    let filter = {};
    let sort = { date: -1 }; // Default sort by most recent

    if (type) {
      filter.type = type;
    }
    if (player) {
      filter.player = player;
    }
    if (team) {
      filter.team = team;
    }

    if (sortBy) {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'player.name') {
        sort['player.name'] = order; // Sort by populated player's name
      } else if (sortBy === 'team.name') {
        sort['team.name'] = order;
      } else {
        sort[sortBy] = order;
      }
    }

    const cacheKey = `news:${JSON.stringify(req.query)}`;
    let cachedNews;
    try {
      cachedNews = await redisClient.get(cacheKey);
      if (cachedNews) {
        logger.info(`Serving news from cache for key: ${cacheKey}`);
        return res.json(JSON.parse(cachedNews));
      }
    } catch (cacheError) {
      logger.error(`Error parsing cached news for key ${cacheKey}:`, cacheError);
      // Fall through to fetch from database if cache parsing fails
    }

    logger.info('Attempting to fetch news from database...');
    const news = await News.find(filter)
      .populate('player', 'name photoUrl')
      .populate('team', 'name code crestUrl')
      .sort(sort);
    logger.info(`Successfully fetched ${news.length} news articles from database.`);

    await redisClient.setex(cacheKey, 3600, JSON.stringify(news)); // Cache for 1 hour
    logger.info(`Cached news for key: ${cacheKey}`);

    res.json(news);
  } catch (error) {
    logger.error('Error fetching news:', error);
    res.status(500).json({ message: 'Error fetching news' });
  }
});

// GET a single news article by ID
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `news:${req.params.id}`;
    let cachedNewsArticle;
    try {
      cachedNewsArticle = await redisClient.get(cacheKey);
      if (cachedNewsArticle) {
        logger.info(`Serving news article from cache for key: ${cacheKey}`);
        return res.json(JSON.parse(cachedNewsArticle));
      }
    } catch (cacheError) {
      logger.error(`Error parsing cached news article for key ${cacheKey}:`, cacheError);
      // Fall through to fetch from database if cache parsing fails
    }

    const newsArticle = await News.findById(req.params.id)
      .populate('player', 'name photoUrl')
      .populate('team', 'name code crestUrl');

    if (!newsArticle) {
      return res.status(404).json({ message: 'News article not found' });
    }

    await redisClient.setex(cacheKey, 3600, JSON.stringify(newsArticle)); // Cache for 1 hour
    logger.info(`Cached news article for key: ${cacheKey}`);

    res.json(newsArticle);
  } catch (error) {
    logger.error('Error fetching news article by ID:', error);
    res.status(500).json({ message: 'Error fetching news article' });
  }
});

// CREATE a new news article (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, author, date, type, player, team, imageUrl } = req.body;

    // Basic validation
    if (!title || !content || !author || !date || !type) {
      return res.status(400).json({ message: 'Title, content, author, date, and type are required.' });
    }
    if (!['transfer', 'milestone', 'highlight', 'general', 'injury', 'match_report'].includes(type)) {
      return res.status(400).json({ message: 'Invalid news type.' });
    }

    const newNews = new News({
      title, content, author, date, type, player, team, imageUrl
    });

    await newNews.save();
    // Invalidate relevant caches
    await redisClient.del('news:*'); // Invalidate all news cache
    logger.info('Invalidated news cache after new news creation');

    const populatedNews = await newNews
      .populate('player', 'name photoUrl')
      .populate('team', 'name code crestUrl');

    res.status(201).json(populatedNews);
  } catch (error) {
    logger.error('Error creating news:', error);
    res.status(400).json({ message: error.message });
  }
});

// UPDATE an existing news article by ID (Admin only)
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'content', 'author', 'date', 'type', 'player', 'team', 'imageUrl'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates!' });
    }

    if (req.body.type && !['transfer', 'milestone', 'highlight', 'general', 'injury', 'match_report'].includes(req.body.type)) {
      return res.status(400).json({ message: 'Invalid news type.' });
    }

    const newsArticle = await News.findById(req.params.id);
    if (!newsArticle) {
      return res.status(404).json({ message: 'News article not found' });
    }

    updates.forEach((update) => newsArticle[update] = req.body[update]);
    await newsArticle.save();

    // Invalidate relevant caches
    await redisClient.del(`news:${req.params.id}`); // Invalidate specific news cache
    await redisClient.del('news:*'); // Invalidate all news cache
    logger.info(`Invalidated news cache for ${req.params.id} and all news cache after update`);

    const populatedNews = await newsArticle
      .populate('player', 'name photoUrl')
      .populate('team', 'name code crestUrl');

    res.json(populatedNews);
  } catch (error) {
    logger.error('Error updating news:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE a news article by ID (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const newsArticle = await News.findByIdAndDelete(req.params.id);

    if (!newsArticle) {
      return res.status(404).json({ message: 'News article not found' });
    }

    // Invalidate relevant caches
    await redisClient.del(`news:${req.params.id}`); // Invalidate specific news cache
    await redisClient.del('news:*'); // Invalidate all news cache
    logger.info(`Invalidated news cache for ${req.params.id} and all news cache after deletion`);

    res.json({ message: 'News article deleted successfully' });
  } catch (error) {
    logger.error('Error deleting news:', error);
    res.status(500).json({ message: 'Error deleting news article' });
  }
});

module.exports = router; 