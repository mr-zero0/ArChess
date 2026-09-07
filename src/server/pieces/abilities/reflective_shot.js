// Reflective Shot Ability (Bishop)
// Bounce off pieces instead of stopping

const BaseAbility = require('./base.js');

class ReflectiveShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 9000; // 9 seconds cooldown
    this.bounceCount = 2; // Number of bounces before stopping
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

    // Reflective shot affects collision processing
    // The actual bounce logic is handled in the collision system
    // We deactivate after a short duration (ability is used on launch)
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual effect for reflective shot activation would go here
    // This would typically show a glow or aura indicating the ability is active
  }

  onDeactivate() {
    // Clean up reflective shot effect
  }

  // Get reflective info for collision system
  getReflectiveInfo() {
    return {
      bounceCount: this.bounceCount,
      isActive: this.isActive
    };
  }
}

module.exports = ReflectiveShotAbility;