// Analytics Service
// Tracks player performance, game statistics, and generates insights

class AnalyticsService {
  constructor(databaseService, redisService) {
    this.db = databaseService;
    this.redis = redisService;
    this.batchSize = 100;
    this.flushInterval = 5000; // 5 seconds
    this.eventBuffer = [];

    // Start periodic flush
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  // Track a game event
  trackEvent(eventType, gameId, playerId, data) {
    const event = {
      type: eventType,
      gameId,
      playerId,
      timestamp: Date.now(),
      data: data || {}
    };

    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  // Track piece launch
  trackLaunch(pieceId, pieceType, team, forceData, gameId, playerId) {
    this.trackEvent('piece_launch', gameId, playerId, {
      pieceId,
      pieceType,
      team,
      forceData: {
        x: forceData.x,
        y: forceData.y,
        z: forceData.z
      },
      timestamp: Date.now()
    });
  }

  // Track collision
  trackCollision(pieceIdA, pieceIdB, pieceTypeA, pieceTypeB, teamA, teamB, impactData, gameId) {
    this.trackEvent('collision', gameId, null, {
      pieceIdA,
      pieceIdB,
      pieceTypeA,
      pieceTypeB,
      teamA,
      teamB,
      impactData: {
        position: impactData.position,
        normal: impactData.normal,
        impactSpeed: impactData.impactSpeed
      },
      timestamp: Date.now()
    });
  }

  // Track ability usage
  trackAbilityUse(pieceId, pieceType, team, abilityType, gameId, playerId) {
    this.trackEvent('ability_use', gameId, playerId, {
      pieceId,
      pieceType,
      team,
      abilityType,
      timestamp: Date.now()
    });
  }

  // Track piece destruction
  trackDestruction(pieceId, pieceType, team, cause, gameId, playerId) {
    this.trackEvent('piece_destruction', gameId, playerId, {
      pieceId,
      pieceType,
      team,
      cause: cause || 'collision',
      timestamp: Date.now()
    });
  }

  // Track game start/end
  trackGameStart(gameId, whitePlayerId, blackPlayerId, config) {
    this.trackEvent('game_start', gameId, null, {
      whitePlayerId,
      blackPlayerId,
      config,
      timestamp: Date.now()
    });
  }

  trackGameEnd(gameId, winner, moveCount, duration) {
    this.trackEvent('game_end', gameId, null, {
      winner,
      moveCount,
      duration,
      timestamp: Date.now()
    });
  }

  // Track player performance metrics
  trackPlayerPerformance(playerId, gameId, metrics) {
    this.trackEvent('player_performance', gameId, playerId, {
      metrics,
      timestamp: Date.now()
    });
  }

  // Flush buffered events to database
  async flushEvents() {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // In a full implementation, we would batch insert these events
      // For now, we'll log them and rely on the database service's event logging
      eventsToFlush.forEach(event => {
        // This would go to the database via the database service
        // For simplicity, we're just logging in this example
        // In production, you'd want to batch insert for efficiency
      });

      // Actually, let's use the database service if available
      if (this.db && typeof this.db.logGameEvent === 'function') {
        // Process events in batches
        const batchSize = 50;
        for (let i = 0; i < eventsToFlush.length; i += batchSize) {
          const batch = eventsToFlush.slice(i, i + batchSize);
          await Promise.all(batch.map(event =>
            this.db.logGameEvent(
              event.gameId,
              event.type,
              event.data,
              null, // pieceId would be in data
              null  // team would be in data
            )
          ));
        }
      }
    } catch (error) {
      // If flush fails, put events back in buffer to retry
      this.eventBuffer = [...eventsToFlush, ...this.eventBuffer];
      console.error('Failed to flush analytics events:', error);
    }
  }

  // Get player statistics
  async getPlayerStats(playerId) {
    if (!this.db) return null;
    return this.db.getUserStats(playerId);
  }

  // Get game analytics
  async getGameAnalytics(gameId) {
    if (!this.db) return [];
    return this.db.getGameAnalytics(gameId);
  }

  // Get leaderboard
  async getLeaderboard(limit = 50) {
    if (!this.db) return [];
    return this.db.getLeaderboard(limit);
  }

  // Generate match report
  async generateMatchReport(gameId) {
    if (!this.db) return null;

    const events = await this.getGameAnalytics(gameId);
    const launches = events.filter(e => e.type === 'piece_launch');
    const collisions = events.filter(e => e.type === 'collision');
    const destructions = events.filter(e => e.type === 'piece_destruction');
    const abilityUses = events.filter(e => e.type === 'ability_use');

    // Calculate statistics
    const report = {
      gameId,
      totalLaunches: launches.length,
      totalCollisions: collisions.length,
      totalDestructions: destructions.length,
      totalAbilityUses: abilityUses.length,
      launchesByType: {},
      collisionsByType: {},
      destructionsByCause: {},
      abilityUsesByType: {},
      timeline: events.map(e => ({
        timestamp: e.timestamp,
        type: e.type,
        data: e.data
      })).sort((a, b) => a.timestamp - b.timestamp)
    };

    // Process launches by piece type
    launches.forEach(launch => {
      const type = launch.data.pieceType || 'unknown';
      report.launchesByType[type] = (report.launchesByType[type] || 0) + 1;
    });

    // Process collisions by piece types
    collisions.forEach(collision => {
      const key = `${collision.data.pieceTypeA}_vs_${collision.data.pieceTypeB}`;
      report.collisionsByType[key] = (report.collisionsByType[key] || 0) + 1;
    });

    // Process destructions by cause
    destructions.forEach(destruction => {
      const cause = destruction.data.cause || 'unknown';
      report.destructionsByCause[cause] = (report.destructionsByCause[cause] || 0) + 1;
    });

    // Process ability uses by type
    abilityUses.forEach(use => {
      const type = use.data.abilityType || 'unknown';
      report.abilityUsesByType[type] = (report.abilityUsesByType[type] || 0) + 1;
    });

    return report;
  }

  // Cleanup old analytics data
  async cleanupOldData(daysOld = 90) {
    if (this.db && typeof this.db.cleanupOldData === 'function') {
      await this.db.cleanupOldData(daysOld);
    }
  }

  // Shutdown analytics service
  shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush any remaining events
    this.flushEvents();
  }
}

module.exports = AnalyticsService;