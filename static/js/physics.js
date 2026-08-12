"use strict";

window.Physics = Object.freeze({
  launch(piece, dx, dy) {
    const distance = Math.hypot(dx, dy);
    if (distance < GAME_CONFIG.minDragDistance) return false;

    const clampedDistance = Math.min(distance, GAME_CONFIG.maxDragDistance);
    const scale = clampedDistance / distance;
    let vx = dx * scale * GAME_CONFIG.launchStrength;
    let vy = dy * scale * GAME_CONFIG.launchStrength;
    const speed = Math.hypot(vx, vy);

    if (speed > GAME_CONFIG.maxLaunchSpeed) {
      const speedScale = GAME_CONFIG.maxLaunchSpeed / speed;
      vx *= speedScale;
      vy *= speedScale;
    }

    piece.vx = vx;
    piece.vy = vy;
    piece.moving = true;
    piece.trailClock = 0;
    return true;
  },

  step(game, deltaTime) {
    const substeps = Math.max(2, Math.min(4, GAME_CONFIG.physicsSubsteps));
    const stepTime = deltaTime / substeps;
    game.activeCollisions.clear();

    for (let substep = 0; substep < substeps; substep += 1) {
      for (const piece of game.pieces) {
        if (!piece.alive || !piece.moving) continue;
        this.integrate(piece, stepTime);
        this.resolveBoundary(game, piece);
      }
      this.resolvePieceCollisions(game);
    }

    for (const piece of game.pieces) {
      if (!piece.alive) continue;
      const speed = Math.hypot(piece.vx, piece.vy);
      if (piece.moving && speed < GAME_CONFIG.minVelocity && !game.activeCollisions.has(piece.id)) {
        piece.vx = 0;
        piece.vy = 0;
        piece.moving = false;
      }
      this.recordTrail(piece, deltaTime);
    }
  },

  integrate(piece, deltaTime) {
    piece.x += piece.vx * deltaTime;
    piece.y += piece.vy * deltaTime;

    const decay = Math.pow(GAME_CONFIG.friction, deltaTime * 60);
    piece.vx *= decay;
    piece.vy *= decay;

    const speed = Math.hypot(piece.vx, piece.vy);
    if (speed > GAME_CONFIG.maxLaunchSpeed) {
      const scale = GAME_CONFIG.maxLaunchSpeed / speed;
      piece.vx *= scale;
      piece.vy *= scale;
    }
  },

  resolveBoundary(game, piece) {
    const min = piece.radius;
    const max = GAME_CONFIG.boardSize - piece.radius;
    let hitX = false;
    let hitY = false;
    let impact = 0;

    if (piece.x < min) {
      impact = Math.max(impact, Math.abs(piece.vx));
      piece.x = min;
      if (piece.vx < 0) piece.vx *= -GAME_CONFIG.bounceFactor;
      hitX = true;
    } else if (piece.x > max) {
      impact = Math.max(impact, Math.abs(piece.vx));
      piece.x = max;
      if (piece.vx > 0) piece.vx *= -GAME_CONFIG.bounceFactor;
      hitX = true;
    }

    if (piece.y < min) {
      impact = Math.max(impact, Math.abs(piece.vy));
      piece.y = min;
      if (piece.vy < 0) piece.vy *= -GAME_CONFIG.bounceFactor;
      hitY = true;
    } else if (piece.y > max) {
      impact = Math.max(impact, Math.abs(piece.vy));
      piece.y = max;
      if (piece.vy > 0) piece.vy *= -GAME_CONFIG.bounceFactor;
      hitY = true;
    }

    if ((hitX || hitY) && impact > 1.2 && typeof game.onWallImpact === "function") {
      game.onWallImpact(piece, impact);
    }
  },

  resolvePieceCollisions(game) {
    const pieces = game.pieces;

    for (let i = 0; i < pieces.length; i += 1) {
      const a = pieces[i];
      if (!a.alive) continue;

      for (let j = i + 1; j < pieces.length; j += 1) {
        if (!a.alive) break;
        const b = pieces[j];
        if (!b.alive) continue;

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDistance = a.radius + b.radius;
        if (distance >= minDistance) continue;

        if (distance < 0.0001) {
          const seed = (i + 1) * (j + 3);
          const angle = (seed % 17) * 0.37;
          dx = Math.cos(angle) * 0.001;
          dy = Math.sin(angle) * 0.001;
          distance = 0.001;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        const invMassA = 1 / a.mass;
        const invMassB = 1 / b.mass;
        const invMassTotal = invMassA + invMassB;

        a.x -= nx * overlap * (invMassA / invMassTotal);
        a.y -= ny * overlap * (invMassA / invMassTotal);
        b.x += nx * overlap * (invMassB / invMassTotal);
        b.y += ny * overlap * (invMassB / invMassTotal);

        a.x = Math.min(GAME_CONFIG.boardSize - a.radius, Math.max(a.radius, a.x));
        a.y = Math.min(GAME_CONFIG.boardSize - a.radius, Math.max(a.radius, a.y));
        b.x = Math.min(GAME_CONFIG.boardSize - b.radius, Math.max(b.radius, b.x));
        b.y = Math.min(GAME_CONFIG.boardSize - b.radius, Math.max(b.radius, b.y));

        game.activeCollisions.add(a.id);
        game.activeCollisions.add(b.id);

        const relativeVx = b.vx - a.vx;
        const relativeVy = b.vy - a.vy;
        const relativeNormalVelocity = relativeVx * nx + relativeVy * ny;
        const impactSpeed = Math.max(0, -relativeNormalVelocity);

        if (relativeNormalVelocity < 0) {
          const impulseMagnitude =
            (-(1 + GAME_CONFIG.collisionRestitution) * relativeNormalVelocity) /
            invMassTotal;
          const impulseX = impulseMagnitude * nx;
          const impulseY = impulseMagnitude * ny;

          a.vx -= impulseX * invMassA;
          a.vy -= impulseY * invMassA;
          b.vx += impulseX * invMassB;
          b.vy += impulseY * invMassB;

          if (Math.hypot(a.vx, a.vy) >= GAME_CONFIG.minVelocity) a.moving = true;
          if (Math.hypot(b.vx, b.vy) >= GAME_CONFIG.minVelocity) b.moving = true;
        }

        if (impactSpeed >= GAME_CONFIG.minDamageImpact) {
          const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          const lastHit = game.hitPairs.get(pairKey) ?? -Infinity;
          if (game.simTime - lastHit >= GAME_CONFIG.collisionCooldown) {
            game.hitPairs.set(pairKey, game.simTime);
            const damageToA = this.calculateDamage(b, impactSpeed);
            const damageToB = this.calculateDamage(a, impactSpeed);
            if (typeof game.onImpact === "function") {
              game.onImpact({
                a,
                b,
                impactSpeed,
                damageToA,
                damageToB,
                x: (a.x + b.x) * 0.5,
                y: (a.y + b.y) * 0.5,
              });
            }
          }
        }
      }
    }
  },

  calculateDamage(attacker, relativeVelocity) {
    const impactForce = relativeVelocity * GAME_CONFIG.collisionMultiplier;
    const normalizedImpactForce = Math.min(1.6, impactForce / GAME_CONFIG.impactReferenceSpeed);
    const rawDamage = attacker.power * normalizedImpactForce * GAME_CONFIG.damageMultiplier;
    return Math.max(1, Math.min(GAME_CONFIG.maxCollisionDamage, Math.round(rawDamage)));
  },

  recordTrail(piece, deltaTime) {
    for (const point of piece.trail) point.life -= deltaTime;
    piece.trail = piece.trail.filter((point) => point.life > 0);

    if (!piece.alive || !piece.moving) return;
    piece.trailClock += deltaTime;
    if (piece.trailClock < 0.025) return;
    piece.trailClock = 0;
    piece.trail.push({ x: piece.x, y: piece.y, life: GAME_CONFIG.trailLifetime });
    if (piece.trail.length > GAME_CONFIG.maxTrailPoints) piece.trail.shift();
  },
});
