// Collision Detection and Resolution System
// Handles collision events, damage calculation, and special ability interactions

class CollisionSystem {
  constructor(physicsEngine, gameState) {
    this.physicsEngine = physicsEngine;
    this.gameState = gameState;

    // Damage calculation parameters
    this.baseDamagePerVelocity = 2.0; // Damage per unit of impact velocity
    this.massDamageFactor = 0.5; // How much mass affects damage
    this.radiusDamageFactor = 0.3; // How much radius affects damage

    // Special ability modifiers
    this.abilityModifiers = {
      pierce_shot: { damageMultiplier: 1.5, continuesAfterCollision: true },
      blast_shot: { damageMultiplier: 1.0, radius: 2.0, falloff: 0.5 },
      charge_shot: { damageMultiplier: 1.0, overchargeRisk: true },
      curve_shot: { damageMultiplier: 1.0, spinEffect: true }
    };
  }

  // Process collision events from physics engine
  processCollisions() {
    const collisionEvents = this.physicsEngine.getCollisionEvents();

    collisionEvents.forEach(event => {
      this.handleCollision(event);
    });
  }

  // Handle a single collision event
  handleCollision(collisionEvent) {
    const { pieceIdA, pieceIdB, impactSpeed, position } = collisionEvent;

    // Get the game pieces
    const pieceA = this.getPieceById(pieceIdA);
    const pieceB = this.getPieceById(pieceIdB);

    if (!pieceA || !pieceB) return;

    // Calculate damage for each piece
    const damageToA = this.calculateDamage(pieceB, pieceA, impactSpeed);
    const damageToB = this.calculateDamage(pieceA, pieceB, impactSpeed);

    // Apply special ability effects
    const abilityEffectsA = this.applyAbilityEffects(pieceA, pieceB, collisionEvent);
    const abilityEffectsB = this.applyAbilityEffects(pieceB, pieceA, collisionEvent);

    // Apply damage to pieces
    this.applyDamage(pieceA, damageToA, abilityEffectsA);
    this.applyDamage(pieceB, damageToB, abilityEffectsB);

    // Generate collision event for game state
    this.generateCollisionEvent(collisionEvent, damageToA, damageToB);
  }

  // Get piece by ID from game state
  getPieceById(pieceId) {
    return this.gameState.pieces.find(piece => piece.id === pieceId);
  }

  // Calculate damage based on attacker properties and impact
  calculateDamage(attacker, defender, impactSpeed) {
    if (!attacker || !defender) return 0;

    // Base damage from velocity
    let damage = impactSpeed * this.baseDamagePerVelocity;

    // Adjust based on attacker mass (heavier pieces do more damage)
    damage *= (1 + (attacker.mass - 1) * this.massDamageFactor);

    // Adjust based on attacker radius (larger pieces do more damage)
    damage *= (1 + (attacker.radius - 0.5) * this.radiusDamageFactor);

    // Apply material-based modifiers
    damage *= this.getMaterialDamageModifier(attacker.type, defender.type);

    // Apply special ability modifiers
    damage *= this.getAbilityDamageModifier(attacker);

    // Ensure minimum damage
    return Math.max(0.1, damage);
  }

  // Get material-based damage modifier
  getMaterialDamageModifier(attackerType, defenderType) {
    // Material effectiveness chart
    const materialChart = {
      // Wood vs materials
      wood: { wood: 1.0, metal: 0.7, crystal: 1.2 },
      // Metal vs materials
      metal: { wood: 1.3, metal: 1.0, crystal: 0.8 },
      // Crystal vs materials
      crystal: { wood: 0.9, metal: 1.4, crystal: 1.0 }
    };

    // Default material based on piece type (simplified)
    const attackerMaterial = this.getPieceMaterial(attackerType);
    const defenderMaterial = this.getPieceMaterial(defenderType);

    return materialChart[attackerMaterial]?.[defenderMaterial] || 1.0;
  }

  // Get material type for piece
  getPieceMaterial(pieceType) {
    // Simplified material mapping
    const materialMap = {
      pawn: 'wood',
      knight: 'wood',
      bishop: 'wood',
      rook: 'metal',
      queen: 'metal',
      king: 'metal'
    };

    return materialMap[pieceType] || 'wood';
  }

  // Get ability-based damage modifier
  getAbilityDamageModifier(attacker) {
    // This would check if the attacker has an active ability that modifies damage
    // For now, return 1.0 (no modifier)
    return 1.0;
  }

  // Apply special ability effects during collision
  applyAbilityEffects(attacker, defender, collisionEvent) {
    const effects = [];

    // Check for active abilities on attacker
    if (attacker.activeAbilities) {
      attacker.activeAbilities.forEach(ability => {
        switch (ability.type) {
          case 'pierce_shot':
            effects.push({ type: 'pierce_shot', continues: true });
            break;
          case 'blast_shot':
            effects.push({
              type: 'blast_shot',
              position: collisionEvent.position,
              radius: ability.radius || 2.0
            });
            break;
          case 'charge_shot':
            effects.push({ type: 'charge_shot', overcharge: ability.overcharge });
            break;
          default:
            break;
        }
      });
    }

    return effects;
  }

  // Apply damage to a piece and handle special effects
  applyDamage(piece, damage, abilityEffects) {
    if (!piece || damage <= 0) return;

    // Apply damage to HP
    piece.hp -= damage;

    // Apply special ability effects
    abilityEffects.forEach(effect => {
      switch (effect.type) {
        case 'pierce_shot':
          // Piercing shots continue with reduced damage
          // This would be handled in the collision processing loop
          break;
        case 'blast_shot':
          // Blast damage would be applied to nearby pieces
          // This would be handled separately
          break;
        case 'charge_shot':
          // Overcharge might damage the attacker
          if (effect.overcharge && Math.random() < 0.3) {
            piece.hp -= damage * 0.5; // Self-damage from overcharge
          }
          break;
        default:
          break;
      }
    });

    // Check if piece is destroyed
    if (piece.hp <= 0 && piece.alive) {
      this.destroyPiece(piece);
    }
  }

  // Destroy a piece and update game state
  destroyPiece(piece) {
    piece.alive = false;
    piece.hp = 0;

    // In a full implementation, we would also:
    // - Create particle effects
    // - Play destruction sound
    // - Update score/analytics
    // - Notify game state of destruction
  }

  // Generate collision event for game state and analytics
  generateCollisionEvent(collisionEvent, damageA, damageB) {
    // This would create an event for the game state to store
    // For analytics, replays, and debugging
    const event = {
      timestamp: Date.now(),
      pieceIdA: collisionEvent.pieceIdA,
      pieceIdB: collisionEvent.pieceIdB,
      typeA: collisionEvent.typeA,
      typeB: collisionEvent.typeB,
      teamA: collisionEvent.teamA,
      teamB: collisionEvent.teamB,
      position: {
        x: collisionEvent.position.x,
        y: collisionEvent.position.y,
        z: collisionEvent.position.z
      },
      impactSpeed: collisionEvent.impactSpeed,
      damageDealtA: damageA,
      damageDealtB: damageB,
      normal: {
        x: collisionEvent.normal.x,
        y: collisionEvent.normal.y,
        z: collisionEvent.normal.z
      }
    };

    // Add to game state collision history
    if (!this.gameState.collisionHistory) {
      this.gameState.collisionHistory = [];
    }
    this.gameState.collisionHistory.push(event);

    // Keep history manageable
    if (this.gameState.collisionHistory.length > 1000) {
      this.gameState.collisionHistory.shift();
    }
  }

  // Check for blast shot area damage
  applyBlastDamage(blastCenter, blastRadius, baseDamage) {
    const affectedPieces = [];

    this.gameState.pieces.forEach(piece => {
      if (!piece.alive) return;

      const dx = piece.position.x - blastCenter.x;
      const dy = piece.position.y - blastCenter.y;
      const dz = piece.position.z - blastCenter.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance <= blastRadius) {
        // Calculate falloff
        const falloff = 1.0 - (distance / blastRadius) * 0.5; // Linear falloff
        const damage = baseDamage * Math.max(0, falloff);

        affectedPieces.push({ piece, damage, distance });
      }
    });

    return affectedPieces;
  }

  // Clear old collision events (call periodically)
  clearOldEvents(maxAgeMs = 5000) {
    const now = Date.now();
    if (this.gameState.collisionHistory) {
      this.gameState.collisionHistory = this.gameState.collisionHistory.filter(
        event => (now - event.timestamp) < maxAgeMs
      );
    }
  }
}

module.exports = CollisionSystem;