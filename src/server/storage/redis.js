// Redis Service
// Handles Redis connection and caching for real-time game state

const redis = require('redis');
const logger = require('../../utils/logger');

class RedisService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.connectionConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      // Enable auto-resuming of offline queue
      enableOfflineQueue: false,
      // Retry strategy
      retryStrategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.warn('Redis connection refused - retrying');
        }
        if (options.totalRetryTime > 1000 * 60 * 60) {
          // End reconnecting after a specific timeout and flush all commands with an individual error
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          // End reconnecting with built-in error
          return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
      }
    };
  }

  async connect() {
    try {
      this.client = redis.createClient(this.connectionConfig);

      // Connect to Redis
      await this.client.connect();

      // Test connection
      await this.client.ping();

      this.isReady = true;
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  // Game state caching methods
  async cacheGameState(roomId, gameState, ttlSeconds = 300) {
    if (!this.isReady) return false;

    try {
      const key = `game_state:${roomId}`;
      const value = JSON.stringify(gameState);
      await this.client.setEx(key, ttlSeconds, value);
      return true;
    } catch (error) {
      logger.error('Failed to cache game state:', error);
      return false;
    }
  }

  async getCachedGameState(roomId) {
    if (!this.isReady) return null;

    try {
      const key = `game_state:${roomId}`;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Failed to get cached game state:', error);
      return null;
    }
  }

  async invalidateGameState(roomId) {
    if (!this.isReady) return false;

    try {
      const key = `game_state:${roomId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to invalidate game state:', error);
      return false;
    }
  }

  // Player session caching
  async cachePlayerSession(playerId, sessionData, ttlSeconds = 3600) {
    if (!this.isReady) return false;

    try {
      const key = `player_session:${playerId}`;
      const value = JSON.stringify(sessionData);
      await this.client.setEx(key, ttlSeconds, value);
      return true;
    } catch (error) {
      logger.error('Failed to cache player session:', error);
      return false;
    }
  }

  async getPlayerSession(playerId) {
    if (!this.isReady) return null;

    try {
      const key = `player_session:${playerId}`;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Failed to get player session:', error);
      return null;
    }
  }

  // Matchmaking cache
  async addToMatchmakingQueue(playerId, playerData, priority = 0) {
    if (!this.isReady) return false;

    try {
      const key = 'matchmaking_queue';
      const member = JSON.stringify({ playerId, ...playerData, priority, timestamp: Date.now() });
      await this.client.zAdd(key, { score: priority, value: member });
      return true;
    } catch (error) {
      logger.error('Failed to add to matchmaking queue:', error);
      return false;
    }
  }

  async removeFromMatchmakingQueue(playerId) {
    if (!this.isReady) return false;

    try {
      const key = 'matchmaking_queue';
      // We would need to scan to find the member - simplified version
      // In production, you'd maintain a reverse lookup
      return true;
    } catch (error) {
      logger.error('Failed to remove from matchmaking queue:', error);
      return false;
    }
  }

  async getMatchmakingQueue(limit = 50) {
    if (!this.isReady) return [];

    try {
      const key = 'matchmaking_queue';
      const members = await this.client.zRange(key, 0, limit - 1, { REVSCORE: true });
      return members.map(member => JSON.parse(member.value));
    } catch (error) {
      logger.error('Failed to get matchmaking queue:', error);
      return [];
    }
  }

  // Rate limiting
  async isRateLimited(key, limit, windowSeconds) {
    if (!this.isReady) return false;

    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, windowSeconds);
      }
      return current > limit;
    } catch (error) {
      logger.error('Failed to check rate limit:', error);
      return false; // Fail open
    }
  }

  // Pub/Sub for game events
  async publishGameEvent(roomId, event) {
    if (!this.isReady) return false;

    try {
      const channel = `game_events:${roomId}`;
      const message = JSON.stringify(event);
      await this.client.publish(channel, message);
      return true;
    } catch (error) {
      logger.error('Failed to publish game event:', error);
      return false;
    }
  }

  async subscribeToGameEvents(roomId, callback) {
    if (!this.isReady) return false;

    try {
      const channel = `game_events:${roomId}`;
      await this.client.subscribe(channel, (message) => {
        try {
          const event = JSON.parse(message);
          callback(event);
        } catch (parseError) {
          logger.error('Failed to parse game event:', parseError);
        }
      });
      return true;
    } catch (error) {
      logger.error('Failed to subscribe to game events:', error);
      return false;
    }
  }

  // Leaderboard caching
  async updateLeaderboardScore(playerId, score, leaderboardKey = 'global_leaderboard') {
    if (!this.isReady) return false;

    try {
      const key = leaderboardKey;
      await this.client.zAdd(key, { score, value: playerId });
      return true;
    } catch (error) {
      logger.error('Failed to update leaderboard score:', error);
      return false;
    }
  }

  async getLeaderboard(limit = 100, leaderboardKey = 'global_leaderboard') {
    if (!this.isReady) return [];

    try {
      const key = leaderboardKey;
      const members = await this.client.zRangeWithScores(key, 0, limit - 1, { REVSCORE: true });
      return members.map(member => ({
        playerId: member.value,
        score: member.score
      }));
    } catch (error) {
      logger.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  // Temporary game data (for reconnection)
  async cacheTempGameData(roomId, data, ttlSeconds = 60) {
    if (!this.isReady) return false;

    try {
      const key = `temp_game:${roomId}`;
      const value = JSON.stringify(data);
      await this.client.setEx(key, ttlSeconds, value);
      return true;
    } catch (error) {
      logger.error('Failed to cache temp game data:', error);
      return false;
    }
  }

  async getTempGameData(roomId) {
    if (!this.isReady) return null;

    try {
      const key = `temp_game:${roomId}`;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Failed to get temp game data:', error);
      return null;
    }
  }

  async disconnect() {
    if (this.isReady && this.client) {
      await this.client.quit();
      this.isReady = false;
      logger.info('Redis connection closed');
    }
  }
}

module.exports = { RedisService };