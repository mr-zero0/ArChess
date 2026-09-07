// Piercing Shot Ability (Bishop)
// Damage continues through pieces with reduction

const BaseAbility = require('./base.js');

class PiercingShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 7000; // 7 seconds cooldown
    this.pierceCount = 2; // Can pierce through up to 2 additional pieces
    this.damageReductionPerPierce = 0.3; // 30% damage reduction per pierce
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

    // Piercing shot affects collision processing
    // The actual piercing logic is handled in the collision system
    // We deactivate after a short duration (ability is used on launch)
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual effect for piercing shot activation would go here
  }

  onDeactivate() {
    // Clean up piercing shot effect
  }

  // Get piercing info for collision system
  getPiercingInfo() {
    return {
      pierceCount: this.pierceCount,
      damageReductionPerPierce: this.damageReductionPerPierce,
      isActive: this.isActive
    };
  }
}

module.exports = PiercingShotAbility;