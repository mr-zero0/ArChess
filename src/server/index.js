// Main Server Entry Point
// Sets up Express, Socket.IO, and initializes game services

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { DatabaseService } = require('./storage/database');
const { RedisService } = require('./storage/redis');
const NetworkHandlers = require('./network/handlers');
const { AnalyticsService } = require('./services/analytics');
const logger = require('./utils/logger');

// Load environment variables
require('dotenv').config();

class GameServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    this.port = process.env.PORT || 3000;
    this.database = null;
    this.redis = null;
    this.networkHandlers = null;
    this.analyticsService = null;
  }

  async initialize() {
    try {
      logger.info('Initializing game server...');

      // Initialize middleware
      this.setupMiddleware();

      // Initialize database connections
      await this.initializeStorage();

      // Initialize services
      this.initializeServices();

      // Set up Socket.IO handlers
      this.setupSocketIO();

      // Set up API routes
      this.setupRoutes();

      // Start periodic cleanup tasks
      this.setupPeriodicTasks();

      logger.info('Game server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize game server:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // CORS middleware
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // API info endpoint
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'Physics Chess Variant Server',
        version: '1.0.0',
        status: 'running'
      });
    });
  }

  async initializeStorage() {
    // Initialize database
    this.database = new DatabaseService();
    await this.database.connect();

    // Initialize Redis
    this.redis = new RedisService();
    await this.redis.connect();

    logger.info('Storage services initialized');
  }

  initializeServices() {
    // Initialize analytics service
    this.analyticsService = new AnalyticsService(this.database, this.redis);

    logger.info('Services initialized');
  }

  setupSocketIO() {
    // Initialize network handlers
    this.networkHandlers = new NetworkHandlers(this.io);

    // Handle Socket.IO connection events for logging
    this.io.on('connection', (socket) => {
      logger.debug(`Socket connected: ${socket.id}`);
    });

    this.io.on('disconnect', (socket) => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });

    logger.info('Socket.IO handlers initialized');
  }

  setupRoutes() {
    // API routes would go here
    const apiRouter = require('./api/routes');
    this.app.use('/api', apiRouter);

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      const path = require('path');
      this.app.use(express.static(path.join(__dirname, '../../client/build')));

      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../client/build/index.html'));
      });
    }

    logger.info('API routes configured');
  }

  setupPeriodicTasks() {
    // Cleanup empty rooms every hour
    setInterval(() => {
      if (this.networkHandlers) {
        this.networkHandlers.cleanupEmptyRooms();
      }
    }, 3600000); // 1 hour

    // Clear old analytics data daily
    setInterval(() => {
      if (this.analyticsService) {
        this.analyticsService.cleanupOldData();
      }
    }, 86400000); // 24 hours

    logger.info('Periodic tasks configured');
  }

  async start() {
    try {
      await this.initialize();

      this.server.listen(this.port, () => {
        logger.info(`Game server listening on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start game server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);

      // Stop accepting new connections
      this.server.close(async (err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }

        // Close database connections
        if (this.database) {
          await this.database.disconnect();
        }

        // Close Redis connection
        if (this.redis) {
          await this.redis.disconnect();
        }

        logger.info('Server shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.warn('Forcing shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the server
const gameServer = new GameServer();
gameServer.start();

module.exports = gameServer;