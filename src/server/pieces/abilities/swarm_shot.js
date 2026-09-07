// Swarm Shot Ability (Pawn)
// Launches multiple weaker shots in a spread pattern

const BaseAbility = require('./base.js');

class SwarmShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 8000; // 8 seconds cooldown
    this.shotCount = 3; // Number of shots in the swarm
    this.spreadAngle = 30; // Degrees of spread
    this.damageReduction = 0.6; // Each shot does 40% of normal damage
  }

  canUse() {
    return !this.isActive && this.cooldown <= 0;
  }

  activate() {
    if (!this.canUse()) return false;

    this.isActive = true;
    this.activationTime = Date.now();
    this.cooldown = this.maxCooldown;

    this.onActivate();
    return true;
  }

  update(deltaTime) {
    super.update(deltaTime);

    // Swarm shot is used at launch time
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual effect for swarm activation would go here
  }

  onDeactivate() {
    // Clean up swarm effect
  }

  // Get swarm info for launch system
  getSwarmInfo() {
    return {
      shotCount: this.shotCount,
      spreadAngle: this.spreadAngle,
      damageReduction: this.damageReduction,
      isActive: this.isActive
    };
  }
}

module.exports = SwarmShotAbility;