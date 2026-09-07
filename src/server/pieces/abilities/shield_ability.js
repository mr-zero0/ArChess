// Shield Ability (Pawn)
// Provides temporary damage resistance

const BaseAbility = require('./base.js');

class ShieldAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 12000; // 12 seconds cooldown
    this.duration = 5000; // 5 seconds duration
    this.damageReduction = 0.7; // 70% damage reduction while active
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
  }

  onActivate() {
    // Visual effect for shield activation would go here
    // This would typically show a shield aura around the piece
  }

  onDeactivate() {
    // Clean up shield effect
  }

  // Get damage reduction factor while active
  getDamageReduction() {
    return this.isActive ? this.damageReduction : 0;
  }
}

module.exports = ShieldAbility;