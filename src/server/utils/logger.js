// Logger Utility
// Configures Winston logger for the application

const { createLogger, format, transports } = require('winston');
const path = require('path = require('path');
const os = require('os');

// Custom format for colored console output in development
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.printf(
    info => `[${info.timestamp}] ${info.level}: ${info.message}`
  )
);

// File format (no colors)
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

class Logger {
  constructor() {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    const fs = require('fs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: fileFormat,
      defaultMeta: { service: 'chess-variant-server' },
      transports: [
        // Console transport
        new transports.Console({
          format: consoleFormat
        }),
        // File transport - all logs
        new transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // File transport - errors only
        new transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // If we're not in production, also log to console with colors
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new transports.Console({
        format: consoleFormat
      }));
    }
  }

  info(message, meta) {
    this.logger.info(message, meta);
  }

  warn(message, meta) {
    this.logger.warn(message, meta);
  }

  error(message, meta) {
    this.logger.error(message, meta);
  }

  debug(message, meta) {
    this.logger.debug(message, meta);
  }

  // HTTP request logger middleware
  requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: duration
      });
    });
    next();
  }
}

module.exports = new Logger();