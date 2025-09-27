// Centralized Logging Utility
const config = require('../config');

class Logger {
  constructor() {
    this.level = config.logging.level || 'info';
  }

  // Log levels
  levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  // Check if log level is enabled
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  // Format log message
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const formattedMeta = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    
    return `${timestamp} [${level.toUpperCase()}] ${message} ${formattedMeta}`.trim();
  }

  // Error logging
  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  // Warning logging
  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  // Info logging
  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  // Debug logging
  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  // Log with custom level
  log(level, message, meta = {}) {
    if (this.shouldLog(level)) {
      switch (level) {
        case 'error':
          console.error(this.formatMessage(level, message, meta));
          break;
        case 'warn':
          console.warn(this.formatMessage(level, message, meta));
          break;
        case 'info':
          console.info(this.formatMessage(level, message, meta));
          break;
        case 'debug':
          console.debug(this.formatMessage(level, message, meta));
          break;
        default:
          console.log(this.formatMessage(level, message, meta));
      }
    }
  }
}

module.exports = new Logger();