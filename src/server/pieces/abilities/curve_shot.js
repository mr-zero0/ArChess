// Curve Shot Ability
// Applies spin to the piece causing it to curve in flight (Magnus effect)

const BaseAbility = require('./base.js');

class CurveShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 8000; // 8 seconds cooldown
    this.spinMagnitude = 5.0; // How much spin to apply
    this.spinDuration = 2000; // How long spin affects flight (ms)
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

    // Curve shot affects the physics during flight
    // The actual curve is applied in the physics engine when the ability is active
  }

  onActivate() {
    // Visual/audio effect for curve activation would go here
    // This would typically show spin indicators on the piece
  }

  onDeactivate() {
    // Clean up curve effect
  }

  // Calculate spin vector based on launch direction
  // This would be called by the physics engine during launch
  calculateSpinVector(launchDirection) {
    // For simplicity, we'll apply spin perpendicular to launch direction
    // In a real implementation, this would be based on player input
    return new THREE.Vector3(
      -launchDirection.z,
      launchDirection.y,
      launchDirection.x
    ).normalize().multiplyScalar(this.spinMagnitude);
  }
}

module.exports = CurveShotAbility;