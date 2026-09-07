// Guard Stance Ability (King)
// Reflect damage back to attacker

const BaseAbility = require('./base.js');

class GuardStanceAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 20000; // 20 seconds cooldown
    this.duration = 8000; // 8 seconds duration
    this.reflectPercentage = 0.5; // Reflect 50% of damage back to attacker
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
    // Visual effect for guard stance activation would go here
    // This would typically show a shield or barrier around the king
  }

  onDeactivate() {
    // Clean up guard stance effect
  }

  // Get reflection factor while active
  getReflectionFactor() {
    return this.isActive ? this.reflectPercentage : 0;
  }

  // Get info for UI
  getInfo() {
    return {
      name: 'Guard Stance',
      isActive: this.isActive,
      cooldown: this.cooldown,
      maxCooldown: this.maxCooldown,
      isReady: this.canUse(),
      reflectionFactor: this.getReflectionFactor()
    };
  }
}

module.exports = GuardStanceAbility;