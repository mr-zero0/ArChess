// Blast Shot Ability (Rook)
// Area damage on impact in radius

const BaseAbility = require('./base.js');

class BlastShotAbility extends BaseAbility {
  constructor(piece, gameState) {
    super(piece, gameState);
    this.maxCooldown = 8000; // 8 seconds cooldown
    this.blastRadius = 2.0; // Radius of blast effect
    this.blastDamageFalloff = 0.5; // Damage reduction per meter from center
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

    // Blast ability is typically instantaneous, so we deactivate immediately after a short duration
    if (this.isActive && (Date.now() - this.activationTime) > 500) { // 0.5 seconds
      this.deactivate();
    }
  }

  onActivate() {
    // Visual/audio effect for blast activation would go here
    // This would typically create an explosion effect at the impact point
  }

  onDeactivate() {
    // Clean up blast effect
  }

  /**
   * Calculate blast damage at a given distance from the blast center
   * @param {number} distance - Distance from blast center in meters
   * @param {number} baseDamage - Base damage of the blast
   * @returns {number} Damage after falloff
   */
  calculateBlastDamage(distance, baseDamage) {
    if (distance >= this.blastRadius) return 0;

    // Linear falloff: damage decreases linearly from center to edge
    const falloffFactor = 1.0 - (distance / this.blastRadius) * this.blastDamageFalloff;
    return Math.max(0, baseDamage * falloffFactor);
  }

  /**
   * Get pieces affected by blast within radius
   * @param {Object} blastCenter - {x, y, z} position of blast center
   * @returns {Array} Array of {piece, distance} objects within blast radius
   */
  getBlastAffectedPieces(blastCenter) {
    const affected = [];

    this.gameState.pieces.forEach(piece => {
      if (!piece.alive) return;

      const dx = piece.position.x - blastCenter.x;
      const dy = piece.position.y - blastCenter.y;
      const dz = piece.position.z - blastCenter.z;
      const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (distance <= this.blastRadius) {
        affected.push({ piece, distance });
      }
    });

    return affected;
  }
}

module.exports = BlastShotAbility;