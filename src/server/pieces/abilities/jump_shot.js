// Jump Shot Ability (Knight)
// Ignore first collision, continue with reduced velocity

const BaseAbility = require('./base.js');

class JumpShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 6000; // 6 seconds cooldown
    this.velocityReduction = 0.5; // 50% velocity after first collision
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

    // Jump shot affects collision processing
    // The actual jump logic is handled in the collision system
    // We deactivate after a short duration (ability is used on launch)
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual effect for jump shot activation would go here
  }

  onDeactivate() {
    // Clean up jump shot effect
  }

  // Get jump info for collision system
  getJumpInfo() {
    return {
      velocityReduction: this.velocityReduction,
      isActive: this.isActive
    };
  }
}

module.exports = JumpShotAbility;