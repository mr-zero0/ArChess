// Teleport Ability (Knight)
// Short-range blink before launch

const BaseAbility = require('./base.js');

class TeleportAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 10000; // 10 seconds cooldown
    this.teleportRange = 2.0; // Maximum teleport distance in board units
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

    // Teleport is used before launch
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual effect for teleport activation would go here
    // This would typically show a blink effect on the piece
  }

  onDeactivate() {
    // Clean up teleport effect
  }

  // Get teleport info for launch system
  getTeleportInfo() {
    return {
      teleportRange: this.teleportRange,
      isActive: this.isActive
    };
  }
}

module.exports = TeleportAbility;