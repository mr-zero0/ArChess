// Cascade Shot Ability (Queen)
// Chain reaction between pieces

const BaseAbility = require('./base.js');

class CascadeShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 18000; // 18 seconds cooldown
    this.chainRadius = 4.0; // Radius to search for chain targets
    this.damageReductionPerChain = 0.4; // 40% damage reduction per chain link
    this.maxChainLength = 3; // Maximum number of chains
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

    // Cascade shot is used at launch time
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual effect for cascade shot activation would go here
    // This would typically show a chaining effect between pieces
  }

  onDeactivate() {
    // Clean up cascade shot effect
  }

  // Get cascade info for collision system
  getCascadeInfo() {
    return {
      chainRadius: this.chainRadius,
      damageReductionPerChain: this.damageReductionPerChain,
      maxChainLength: this.maxChainLength,
      isActive: this.isActive
    };
  }
}

module.exports = CascadeShotAbility;