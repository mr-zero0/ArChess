// API Routes
// RESTful endpoints for game management, user authentication, analytics, etc.

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

// Mock database service for demonstration (would be injected in real implementation)
// In a full implementation, these would be dependency injected
let dbService = null;

// Initialize with database service (would be called from main server)
function initRoutes(databaseService) {
  dbService = databaseService;
}

// Authentication routes
router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // In a real implementation, we would hash the password
    const passwordHash = password; // Simplified - use bcrypt in production

    const user = await dbService.createUser(username, email, passwordHash);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Registration failed:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // In a real implementation, we would compare hashed passwords
    const user = await dbService.getUserByUsername(username);

    if (!user || user.password_hash !== password) { // Simplified - use bcrypt in production
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last seen
    await dbService.updateUserLastSeen(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Game management routes
router.post('/games', async (req, res) => {
  try {
    const { whitePlayerId, blackPlayerId, config } = req.body;
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const game = await dbService.createGame(gameId, whitePlayerId, blackPlayerId, config);

    res.status(201).json({
      success: true,
      game: {
        id: game.id,
        gameId: game.game_id,
        whitePlayerId: game.white_player_id,
        blackPlayerId: game.black_player_id,
        startTime: game.start_time
      }
    });
  } catch (error) {
    logger.error('Game creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Game creation failed'
    });
  }
});

router.put('/games/:gameId/result', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { winner, finalState, moveCount } = req.body;

    await dbService.updateGameResult(gameId, winner, finalState, moveCount);

    res.json({
      success: true,
      message: 'Game result updated'
    });
  } catch (error) {
    logger.error('Failed to update game result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game result'
    });
  }
});

// Analytics routes
router.get('/analytics/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const analytics = await dbService.getGameAnalytics(gameId);

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Failed to get game analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game analytics'
    });
  }
});

router.get('/analytics/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await dbService.getUserStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user stats'
    });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await dbService.getLeaderboard(limit);

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    logger.error('Failed to get leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Variant management routes
router.get('/variants', async (req, res) => {
  try {
    // In a real implementation, we would fetch from database
    const variants = [
      {
        id: 'standard',
        name: 'Standard King Destruction',
        description: 'Destroy the enemy king to win',
        isDefault: true,
        isCustom: false
      },
      {
        id: 'timed',
        name: 'Timed Match',
        description: 'Most destruction wins when time runs out',
        isDefault: false,
        isCustom: false
      },
      {
        id: 'points',
        name: 'Points Match',
        description: 'First to N points wins',
        isDefault: false,
        isCustom: false
      },
      {
        id: 'survivor',
        name: 'Survivor',
        description: 'Last team with pieces remaining wins',
        isDefault: false,
        isCustom: false
      }
    ];

    res.json({
      success: true,
      variants
    });
  } catch (error) {
    logger.error('Failed to get variants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get variants'
    });
  }
});

router.post('/variants', async (req, res) => {
  try {
    const { name, description, config } = req.body;
    const variantId = `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, we would save to database
    // For now, just return the created variant
    res.status(201).json({
      success: true,
      variant: {
        id: variantId,
        name,
        description,
        config,
        isCustom: true,
        isDefault: false
      }
    });
  } catch (error) {
    logger.error('Failed to create variant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create variant'
    });
  }
});

// Health check route (already in main server, but included here for completeness)
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, initRoutes };