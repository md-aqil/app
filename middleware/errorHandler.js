// Error Handling Middleware
const logger = require('../utils/logger');

// Async error wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Error handling middleware
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    params: req.params,
    query: req.query,
    body: req.body
  });

  // Send error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
}

// Validation error handler
function handleValidationError(err, res) {
  if (err.name === 'ValidationError') {
    logger.warn('Validation error', {
      error: err.message,
      details: err.details
    });
    
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.details
    });
  }
  
  return false;
}

// Shopify API error handler
function handleShopifyError(err, res) {
  if (err.message.includes('Shopify')) {
    logger.error('Shopify API error', {
      error: err.message
    });
    
    return res.status(502).json({
      error: 'Shopify API error',
      message: 'Failed to communicate with Shopify. Please try again later.'
    });
  }
  
  return false;
}

// WhatsApp API error handler
function handleWhatsAppError(err, res) {
  if (err.message.includes('WhatsApp') || err.message.includes('131030')) {
    logger.error('WhatsApp API error', {
      error: err.message
    });
    
    // Special handling for "Recipient phone number not in allowed list" error
    if (err.message.includes('131030')) {
      return res.status(400).json({
        error: 'WhatsApp opt-in required',
        message: 'The customer needs to send a message to your WhatsApp Business number first to opt-in before you can message them.'
      });
    }
    
    return res.status(502).json({
      error: 'WhatsApp API error',
      message: 'Failed to communicate with WhatsApp. Please try again later.'
    });
  }
  
  return false;
}

module.exports = {
  asyncHandler,
  errorHandler,
  handleValidationError,
  handleShopifyError,
  handleWhatsAppError
};