const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getPool } = require('../storage/database');

// Get all games (with pagination)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM games');
    const total = parseInt(totalResult[0].total);

    const [games] = await pool.query(
      'SELECT g.*, u1.username as white_username, u2.username as black_username ' +
      'FROM games g ' +
      'LEFT JOIN users u1 ON g.white_player_id = u1.id ' +
      'LEFT JOIN users u2 ON g.black_player_id = u2.id ' +
      'ORDER BY g.started_at DESC ' +
      'LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.json({
      games,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific game by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [games] = await pool.query(
      'SELECT g.*, u1.username as white_username, u2.username as black_username ' +
      'FROM games g ' +
      'LEFT JOIN users u1 ON g.white_player_id = u1.id ' +
      'LEFT JOIN users u2 ON g.black_player_id = u2.id ' +
      'WHERE g.id = ?',
      [req.params.id]
    );

    if (games.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(games[0]);
  } catch (error) {
    logger.error('Error fetching game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get games by room ID
router.get('/room/:roomId', async (req, res) => {
  try {
    const pool = getPool();
    const [games] = await pool.query(
      'SELECT g.*, u1.username as white_username, u2.username as black_username ' +
      'FROM games g ' +
      'LEFT JOIN users u1 ON g.white_player_id = u1.id ' +
      'LEFT JOIN users u2 ON g.black_player_id = u2.id ' +
      'WHERE g.room_id = ? ' +
      'ORDER BY g.started_at DESC',
      [req.params.roomId]
    );

    res.json(games);
  } catch (error) {
    logger.error('Error fetching games by room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new game record (typically called when a game ends)
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      roomId,
      whitePlayerId,
      blackPlayerId,
      winnerTeam,
      gameMode,
      moveCount,
      gameState,
      replayData
    } = req.body;

    // Validate required fields
    if (!roomId || !whitePlayerId || !blackPlayerId || !winnerTeam) {
      return res.status(400).json({
        error: 'Missing required fields: roomId, whitePlayerId, blackPlayerId, winnerTeam'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO games (room_id, white_player_id, black_player_id, winner_team, game_mode, move_count, game_state, replay_data) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [roomId, whitePlayerId, blackPlayerId, winnerTeam, gameMode || 'standard', moveCount || 0,
       JSON.stringify(gameState || {}), JSON.stringify(replayData || {})]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Game record created successfully'
    });
  } catch (error) {
    logger.error('Error creating game record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a game (e.g., to add replay data after processing)
router.put('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { gameState, replayData } = req.body;

    const [result] = await pool.query(
      'UPDATE games SET game_state = ?, replay_data = ? WHERE id = ?',
      [JSON.stringify(gameState || {}), JSON.stringify(replayData || {}), req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({ message: 'Game updated successfully' });
  } catch (error) {
    logger.error('Error updating game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a game
router.delete('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM games WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    logger.error('Error deleting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { setupApiRoutes: (app) => app.use('/api/games', router) };