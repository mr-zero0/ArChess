// Pierce Shot Ability
// Allows damage to continue through multiple pieces with reduction

const BaseAbility = require('./base.js');

class PierceShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 7000; // 7 seconds cooldown
    this.pierceCount = 3; // Can pierce through up to 3 pieces
    this.damageReductionPerPierce = 0.25; // 25% damage reduction per pierce
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

    // Pierce shot affects collision processing
    // The actual piercing logic is handled in the collision system
    // We deactivate after a short duration (ability is used on launch)
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual/audio effect for pierce activation would go here
  }

  onDeactivate() {
    // Clean up pierce effect
  }

  // Get pierce info for collision system
  getPierceInfo() {
    return {
      pierceCount: this.pierceCount,
      damageReductionPerPierce: this.damageReductionPerPierce,
      isActive: this.isActive
    };
  }
}

module.exports = PierceShotAbility;