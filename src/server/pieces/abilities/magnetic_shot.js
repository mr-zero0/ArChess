// Magnetic Shot Ability (Rook)
// Pull pieces toward impact point

const BaseAbility = require('./base.js');

class MagneticShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 12000; // 12 seconds cooldown
    this.magneticRadius = 3.0; // Radius of magnetic effect
    this.pullStrength = 2.0; // Strength of pull force
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

    // Magnetic shot affects collision processing
    // The actual pull logic is handled in the collision system
    // We deactivate after a short duration (ability is used on launch)
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual effect for magnetic shot activation would go here
    // This would typically show a magnetic field around the piece
  }

  onDeactivate() {
    // Clean up magnetic shot effect
  }

  // Get magnetic info for collision system
  getMagneticInfo() {
    return {
      magneticRadius: this.magneticRadius,
      pullStrength: this.pullStrength,
      isActive: this.isActive
    };
  }
}

module.exports = MagneticShotAbility;