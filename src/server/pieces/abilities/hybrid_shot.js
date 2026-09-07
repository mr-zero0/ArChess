// Hybrid Shot Ability (Queen)
// Combine two abilities of your choice

const BaseAbility = require('./base.js');

class HybridShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 15000; // 15 seconds cooldown
    // This ability would allow combining two other abilities
    // Implementation would depend on the game's ability system
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

    // Hybrid shot is used at launch time
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual effect for hybrid shot activation would go here
    // This would typically show a combination of ability effects
  }

  onDeactivate() {
    // Clean up hybrid shot effect
  }

  // Get hybrid info for ability system
  getHybridInfo() {
    return {
      // Would contain information about which abilities are combined
      isActive: this.isActive
    };
  }
}

module.exports = HybridShotAbility;