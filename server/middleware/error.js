const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // In production, you might not want to send the stack trace
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler; 