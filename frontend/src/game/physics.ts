import type { ArenaPiece, Team } from "./types.ts";
import { GAME_RULES, calculateDamage } from "./rules.ts";

export const PHYSICS = {
  boardSize: GAME_RULES.boardSize,
  friction: GAME_RULES.friction,
  minVelocity: GAME_RULES.minVelocity,
  bounce: GAME_RULES.collisionRestitution,
  separation: 0.003,
  impactThreshold: GAME_RULES.minDamageImpact,
  damageMultiplier: GAME_RULES.damageMultiplier,
  settleDelay: GAME_RULES.settleDelay,
  maxSpeed: GAME_RULES.maxLaunchSpeed,
  impulseEpsilon: 0.001,
};

export type PhysicsEvent =
  | { type: "collision"; a: ArenaPiece; b: ArenaPiece; impact: number; damageA: number; damageB: number }
  | { type: "destroyed"; piece: ArenaPiece; killer: Team }
  | { type: "settled" };

function speed(piece: ArenaPiece) { return Math.hypot(piece.vx, piece.vy); }

function clampPiece(piece: ArenaPiece) {
  const min = piece.radius;
  const max = PHYSICS.boardSize - piece.radius;
  if (piece.x < min) { piece.x = min; piece.vx = Math.abs(piece.vx) * piece.restitution; }
  else if (piece.x > max) { piece.x = max; piece.vx = -Math.abs(piece.vx) * piece.restitution; }
  if (piece.y < min) { piece.y = min; piece.vy = Math.abs(piece.vy) * piece.restitution; }
  else if (piece.y > max) { piece.y = max; piece.vy = -Math.abs(piece.vy) * piece.restitution; }
}

export class PhysicsWorld {
  private settleTimer = 0;
  events: PhysicsEvent[] = [];

  reset() { this.settleTimer = 0; this.events = []; }

  launch(piece: ArenaPiece, dx: number, dy: number, power: number) {
    const distance = Math.hypot(dx, dy);
    if (distance < GAME_RULES.minDragDistance) return false;
    const clampedDistance = Math.min(distance, GAME_RULES.maxDragDistance);
    const scale = clampedDistance / distance;
    const force = Math.min(1, Math.max(0, power));
    let vx = dx * scale * GAME_RULES.launchStrength * (piece.launchMul || 1) * force;
    let vy = dy * scale * GAME_RULES.launchStrength * (piece.launchMul || 1) * force;
    const launchSpeed = Math.hypot(vx, vy);
    if (launchSpeed > GAME_RULES.maxLaunchSpeed) {
      const ratio = GAME_RULES.maxLaunchSpeed / launchSpeed;
      vx *= ratio;
      vy *= ratio;
    }
    piece.vx = vx;
    piece.vy = vy;
    piece.moving = true;
    return true;
  }

  step(pieces: ArenaPiece[], dt: number): boolean {
    this.events = [];
    const wasActive = pieces.some((piece) => piece.alive && (piece.moving || speed(piece) > PHYSICS.impulseEpsilon));

    for (const piece of pieces) {
      if (!piece.alive || (speed(piece) <= PHYSICS.impulseEpsilon && !piece.moving)) continue;
      piece.moving = true;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      const decay = Math.pow(piece.friction || GAME_RULES.friction, dt * 60);
      piece.vx *= decay;
      piece.vy *= decay;
      const currentSpeed = speed(piece);
      if (currentSpeed > GAME_RULES.maxLaunchSpeed) {
        const ratio = GAME_RULES.maxLaunchSpeed / currentSpeed;
        piece.vx *= ratio;
        piece.vy *= ratio;
      }
      clampPiece(piece);
    }

    for (let i = 0; i < pieces.length; i += 1) {
      const a = pieces[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < pieces.length; j += 1) {
        const b = pieces[j];
        if (!b.alive) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDistance = a.radius + b.radius;
        if (distance >= minDistance) continue;
        if (distance < 1e-6) { dx = 1; dy = 0; distance = 1; }
        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance + PHYSICS.separation - distance;
        const invA = 1 / a.mass;
        const invB = 1 / b.mass;
        const total = invA + invB;
        a.x -= nx * overlap * invA / total;
        a.y -= ny * overlap * invA / total;
        b.x += nx * overlap * invB / total;
        b.y += ny * overlap * invB / total;

        const relativeNormalVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        const impact = Math.max(0, -relativeNormalVelocity);
        if (relativeNormalVelocity < 0) {
          const restitution = ((a.restitution || PHYSICS.bounce) + (b.restitution || PHYSICS.bounce)) * 0.5;
          const impulse = (-(1 + restitution) * relativeNormalVelocity) / total;
          const ix = impulse * nx;
          const iy = impulse * ny;
          a.vx -= ix * invA;
          a.vy -= iy * invA;
          b.vx += ix * invB;
          b.vy += iy * invB;
          if (speed(a) > PHYSICS.impulseEpsilon) a.moving = true;
          if (speed(b) > PHYSICS.impulseEpsilon) b.moving = true;
        }

        if (impact >= GAME_RULES.minDamageImpact) {
          const damageA = calculateDamage(b, impact);
          const damageB = calculateDamage(a, impact);
          a.hp = Math.max(0, a.hp - damageA);
          b.hp = Math.max(0, b.hp - damageB);
          this.events.push({ type: "collision", a, b, impact, damageA, damageB });
          if (a.hp === 0 && a.alive) {
            a.alive = false; a.moving = false; a.vx = 0; a.vy = 0;
            this.events.push({ type: "destroyed", piece: a, killer: b.team });
          }
          if (b.hp === 0 && b.alive) {
            b.alive = false; b.moving = false; b.vx = 0; b.vy = 0;
            this.events.push({ type: "destroyed", piece: b, killer: a.team });
          }
        }
      }
    }

    for (const piece of pieces) {
      if (!piece.alive) continue;
      if (speed(piece) <= PHYSICS.impulseEpsilon) {
        piece.vx = 0;
        piece.vy = 0;
        piece.moving = false;
      } else {
        piece.moving = true;
      }
    }

    const stillMoving = pieces.some((piece) => piece.alive && speed(piece) >= PHYSICS.minVelocity);
    if (!stillMoving && wasActive) this.settleTimer += dt;
    else if (stillMoving) this.settleTimer = 0;

    if (!stillMoving && wasActive && this.settleTimer >= PHYSICS.settleDelay) {
      for (const piece of pieces) {
        if (!piece.alive || speed(piece) >= PHYSICS.minVelocity) continue;
        piece.vx = 0;
        piece.vy = 0;
        piece.moving = false;
      }
      this.events.push({ type: "settled" });
      this.settleTimer = 0;
      return true;
    }
    return false;
  }
}
