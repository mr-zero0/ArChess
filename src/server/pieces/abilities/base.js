// Base Ability Class
// Foundation for all piece special abilities

class BaseAbility {
  constructor(piece, gameState) {
    this.piece = piece; // Reference to the owning piece
    this.gameState = gameState; // Reference to game state
    this.isActive = false; // Whether the ability is currently active
    this.cooldown = 0; // Current cooldown timer (milliseconds)
    this.maxCooldown = 0; // Maximum cooldown time (milliseconds)
    this.activationTime = null; // Timestamp when ability was activated
    this.duration = 0; // How long the ability lasts when active (milliseconds)
  }

  // Check if ability can be used (not on cooldown and not already active)
  canUse() {
    return !this.isActive && this.cooldown <= 0;
  }

  // Activate the ability
  activate() {
    if (!this.canUse()) return false;

    this.isActive = true;
    this.activationTime = Date.now();
    this.cooldown = this.maxCooldown;

    // Call the specific ability activation logic
    this.onActivate();
    return true;
  }

  // Deactivate the ability (called automatically after duration)
  deactivate() {
    if (!this.isActive) return false;

    this.isActive = false;
    this.onDeactivate();
    return true;
  }

  // Update ability state (called each frame)
  update(deltaTime) {
    // Reduce cooldown
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - deltaTime);
    }

    // Handle automatic deactivation after duration
    if (this.isActive && this.activationTime && this.duration > 0) {
      const elapsed = Date.now() - this.activationTime;
      if (elapsed >= this.duration) {
        this.deactivate();
      }
    }
  }

  // Specific ability activation logic (to be overridden)
  onActivate() {
    // Default implementation - override in subclasses
  }

  // Specific ability deactivation logic (to be overridden)
  onDeactivate() {
    // Default implementation - override in subclasses
  }

  // Get ability info for UI
  getInfo() {
    return {
      name: this.constructor.name.replace('Ability', '').replace(/([A-Z])/g, ' $1').trim(),
      isActive: this.isActive,
      cooldown: this.cooldown,
      maxCooldown: this.maxCooldown,
      isReady: this.canUse()
    };
  }
}

module.exports = BaseAbility;