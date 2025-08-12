const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
};

module.exports = requestLogger; 