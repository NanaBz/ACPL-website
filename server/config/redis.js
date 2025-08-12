const Redis = require('ioredis');
const logger = require('./logger');

const redisClient = new Redis({
  port: process.env.REDIS_PORT || 6379, // Redis port
  host: process.env.REDIS_HOST || '127.0.0.1', // Redis host
  password: process.env.REDIS_PASSWORD, // Redis password (if any)
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

module.exports = redisClient; 