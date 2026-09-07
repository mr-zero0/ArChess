// Charge Shot Ability
// Allows pieces to launch with increased power, but risks self-damage if overcharged

const BaseAbility = require('./base.js');

class ChargeShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 6000; // 6 seconds cooldown
    this.chargeMultiplier = 2.0; // 2x power when fully charged
    this.overchargeThreshold = 0.85; // Overcharge risk starts at 85% charge
    this.overchargeDamage = 0.3; // 30% of damage reflected back to self
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

    // Charge shot is typically a launch-time modifier, not a sustained ability
    // So we deactivate immediately after a short duration (for visual feedback)
    if (this.isActive && (Date.now() - this.activationTime) > 100) { // 0.1 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual/audio effect for charge activation would go here
    // This would typically create a charging effect on the piece
  }

  onDeactivate() {
    // Clean up charge effect
  }

  // Calculate charge multiplier based on charge level (0-1)
  getChargeMultiplier(chargeLevel) {
    // Linear charge: 1.0x to chargeMultiplierx based on charge level
    return 1.0 + (this.chargeMultiplier - 1.0) * chargeLevel;
  }

  // Check if charge level risks overcharge
  isOverchargeRisk(chargeLevel) {
    return chargeLevel >= this.overchargeThreshold;
  }

  // Calculate overcharge damage (applied to self)
  calculateOverchargeDamage(baseDamage, chargeLevel) {
    if (!this.isOverchargeRisk(chargeLevel)) return 0;

    // Overcharge damage increases as charge goes beyond threshold
    const overchargeAmount = (chargeLevel - this.overchargeThreshold) / (1.0 - this.overchargeThreshold);
    return baseDamage * this.overchargeDamage * overchargeAmount;
  }
}

module.exports = ChargeShotAbility;