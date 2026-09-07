// Last Stand Ability (King)
// Enhanced abilities when HP < 30%

const BaseAbility = require('./base.js');

class LastStandAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    // This is a passive ability, so it doesn't have a cooldown in the traditional sense
    // We'll set maxCooldown to 0 to indicate it's passive
    this.maxCooldown = 0;
    this.threshold = 0.3; // 30% HP threshold
    this.enhancementFactor = 1.5; // 50% enhancement when active
  }

  canUse() {
    // Passive abilities are always "usable" in the sense that they are always active when conditions are met
    // But we don't allow activation via the ability system
    return false;
  }

  // We override activate to do nothing because it's passive
  activate() {
    // Passive ability cannot be activated manually
    return false;
  }

  update(deltaTime) {
    // Check if the piece's HP is below the threshold
    const hpPercentage = this.piece.hp / this.piece.maxHp;
    const shouldBeActive = hpPercentage < this.threshold;

    // If the state changed, activate or deactivate
    if (shouldBeActive && !this.isActive) {
      this.isActive = true;
      this.onActivate();
    } else if (!shouldBeActive && this.isActive) {
      this.isActive = false;
      this.onDeactivate();
    }
  }

  onActivate() {
    // Visual effect for last stand activation would go here
    // This would typically show an aura or glow indicating the king is empowered
  }

  onDeactivate() {
    // Clean up last stand effect
  }

  // Get enhancement factor for abilities when last stand is active
  getEnhancementFactor() {
    return this.isActive ? this.enhancementFactor : 1.0;
  }

  // Get info for UI
  getInfo() {
    const hpPercentage = this.piece.hp / this.piece.maxHp;
    return {
      name: 'Last Stand',
      isActive: this.isActive,
      threshold: this.threshold,
      currentHpPercentage: hpPercentage,
      enhancementFactor: this.getEnhancementFactor(),
      isPassive: true
    };
  }
}

module.exports = LastStandAbility;