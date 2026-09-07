// Database Service
// Handles PostgreSQL connection and game data persistence

const { Pool } = require('pg');
const logger = require('../../utils/logger');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.connectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'chess_variant',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: process.env.DB_MAX_CONNECTIONS || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  async connect() {
    try {
      this.pool = new Pool(this.connectionConfig);

      // Test the connection
      await this.pool.query('SELECT NOW()');

      // Initialize database schema
      await this.initializeSchema();

      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async initializeSchema() {
    const client = await this.pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');

      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE,
          password_hash VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_online BOOLEAN DEFAULT FALSE,
          total_games INTEGER DEFAULT 0,
          wins INTEGER DEFAULT 0 INTEGER DEFAULT 0,
          losses INTEGER DEFAULT 0,
          draws INTEGER DEFAULT 0,
          rating INTEGER DEFAULT 1200
        )
      `);

      // Create games table
      await client.query(`
        CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(100) UNIQUE NOT NULL,
          white_player_id INTEGER REFERENCES users(id),
          black_player_id INTEGER REFERENCES users(id),
          winner VARCHAR(10), -- 'white', 'black', 'draw'
          start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          end_time TIMESTAMP,
          move_count INTEGER DEFAULT 0,
          game_config JSONB,
          final_state JSONB
        )
      `);

      // Create game events table (for replays and analytics)
      await client.query(`
        CREATE TABLE IF NOT EXISTS game_events (
          id SERIAL PRIMARY KEY,
          game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
          event_type VARCHAR(50), -- 'launch', 'collision', 'ability_use', etc.
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          event_data JSONB,
          piece_id VARCHAR(100),
          team VARCHAR(10)
        )
      `);

      // Create analytics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS player_analytics (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          game_id INTEGER REFERENCES games(id),
          session_date DATE DEFAULT CURRENT_DATE,
          pieces_destroyed INTEGER DEFAULT 0,
          damage_dealt INTEGER DEFAULT 0,
          damage_taken INTEGER DEFAULT 0,
          accuracy DECIMAL(5,2),
          avg_launch_power DECIMAL(5,2),
          abilities_used JSONB,
          win BOOLEAN
        )
      `);

      // Create game variants table
      await client.query(`
        CREATE TABLE IF NOT EXISTS game_variants (
          id SERIAL PRIMARY KEY,
          variant_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          config JSONB,
          is_default BOOLEAN DEFAULT FALSE,
          is_custom BOOLEAN DEFAULT FALSE,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
        CREATE INDEX IF NOT EXISTS idx_game_events_timestamp ON game_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_games_white_player ON games(white_player_id);
        CREATE INDEX IF NOT EXISTS idx_games_black_player ON games(black_player_id);
        CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner);
        CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON player_analytics(user_id, session_date);
      `);

      // Commit transaction
      await client.query('COMMIT');

      logger.info('Database schema initialized');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      logger.error('Failed to initialize database schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // User management methods
  async createUser(username, email, passwordHash) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, username, email, created_at`,
        [username, email, passwordHash]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserById(userId) {
    const result = await this.pool.query(
      'SELECT id, username, email, created_at, last_seen, is_online, total_games, wins, losses, draws, rating FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async getUserByUsername(username) {
    const result = await this.pool.query(
      'SELECT id, username, email, password_hash, created_at, last_seen, is_online, total_games, wins, losses, draws, rating FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  async updateUserLastSeen(userId) {
    await this.pool.query(
      'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  async setUserOnlineStatus(userId, isOnline) {
    await this.pool.query(
      'UPDATE users SET is_online = $1 WHERE id = $2',
      [isOnline, userId]
    );
  }

  // Game management methods
  async createGame(gameId, whitePlayerId, blackPlayerId, config) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO games (game_id, white_player_id, black_player_id, game_config)
         VALUES ($1, $2, $3, $4)
         RETURNING id, game_id, white_player_id, black_player_id, start_time`,
        [gameId, whitePlayerId, blackPlayerId, JSON.stringify(config)]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateGameResult(gameId, winner, finalState, moveCount) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE games
         SET winner = $1, end_time = CURRENT_TIMESTAMP, move_count = $2, final_state = $3
         WHERE game_id = $4`,
        [winner, moveCount, JSON.stringify(finalState), gameId]
      );

      // Update player statistics
      await client.query(`
        UPDATE users
        SET total_games = total_games + 1,
            wins = CASE WHEN $1 IN ('white', 'black') AND
                     ( (username = (SELECT username FROM users WHERE id = (SELECT white_player_id FROM games WHERE game_id = $4)) AND $1 = 'white') OR
                       (username = (SELECT username FROM users WHERE id = (SELECT black_player_id FROM games WHERE game_id = $4)) AND $1 = 'black') )
                     THEN wins + 1 ELSE wins END,
            losses = CASE WHEN $1 IN ('white', 'black') AND
                     ( (username = (SELECT username FROM users WHERE id = (SELECT white_player_id FROM games WHERE game_id = $4)) AND $1 = 'black') OR
                       (username = (SELECT username FROM users WHERE id = (SELECT black_player_id FROM games WHERE game_id = $4)) AND $1 = 'white') )
                     THEN losses + 1 ELSE losses END,
            draws = CASE WHEN $1 = 'draw' THEN draws + 1 ELSE draws END
        WHERE id IN (
          SELECT white_player_id FROM games WHERE game_id = $5
          UNION
          SELECT black_player_id FROM games WHERE game_id = $5
        )
      `, [winner, gameId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Analytics methods
  async logGameEvent(gameId, eventType, eventData, pieceId = null, team = null) {
    try {
      await this.pool.query(
        `INSERT INTO game_events (game_id, event_type, event_data, piece_id, team)
         VALUES ($1, $2, $3, $4, $5)`,
        [gameId, eventType, JSON.stringify(eventData), pieceId, team]
      );
    } catch (error) {
      logger.error('Failed to log game event:', error);
      // Don't throw - analytics failures shouldn't break gameplay
    }
  }

  async getGameAnalytics(gameId) {
    const result = await this.pool.query(
      `SELECT * FROM game_events WHERE game_id = $1 ORDER BY timestamp ASC`,
      [gameId]
    );
    return result.rows;
  }

  async getUserStats(userId) {
    const result = await this.pool.query(
      `SELECT u.*,
              COUNT(g.id) as total_games_recorded,
              SUM(CASE WHEN g.winner = 'white' AND u.id = g.white_player_id THEN 1 ELSE 0 END) as white_wins,
              SUM(CASE WHEN g.winner = 'black' AND u.id = g.black_player_id THEN 1 ELSE 0 END) as black_wins
       FROM users u
       LEFT JOIN games g ON u.id = g.white_player_id OR u.id = g.black_player_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    return result.rows[0];
  }

  async getLeaderboard(limit = 10) {
    const result = await this.pool.query(
      `SELECT username, wins, losses, draws, rating,
              (wins::decimal / NULLIF(wins + losses + draws, 0)) * 100 as win_rate
       FROM users
       WHERE total_games > 0
       ORDER BY rating DESC, wins DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Cleanup methods
  async cleanupOldData(daysOld = 90) {
    try {
      await this.pool.query(
        `DELETE FROM game_events
         WHERE timestamp < NOW() - INTERVAL '${daysOld} days'`
      );

      await this.pool.query(
        `DELETE FROM player_analytics
         WHERE session_date < CURRENT_DATE - INTERVAL '${daysOld} days'`
      );

      logger.info(`Cleaned up data older than ${daysOld} days`);
    } catch (error) {
      logger.error('Failed to cleanup old data:', error);
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connection closed');
    }
  }
}

module.exports = { DatabaseService };