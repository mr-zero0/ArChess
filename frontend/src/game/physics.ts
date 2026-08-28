import { ArenaPiece, Team } from "./types";

export const PHYSICS = {
  boardSize: 8,
  friction: 0.972,
  minVelocity: 0.18,
  bounce: 0.62,
  separation: 0.003,
  impactThreshold: 1.2,
  damageMultiplier: 1.45,
  settleDelay: 0.12,
  maxSpeed: 12,
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
  if (piece.x < min) { piece.x = min; piece.vx = Math.abs(piece.vx) * PHYSICS.bounce; }
  else if (piece.x > max) { piece.x = max; piece.vx = -Math.abs(piece.vx) * PHYSICS.bounce; }
  if (piece.y < min) { piece.y = min; piece.vy = Math.abs(piece.vy) * PHYSICS.bounce; }
  else if (piece.y > max) { piece.y = max; piece.vy = -Math.abs(piece.vy) * PHYSICS.bounce; }
}

function damage(attacker: ArenaPiece, impact: number) {
  return Math.max(1, Math.min(30, Math.round(attacker.power * impact * PHYSICS.damageMultiplier / 6)));
}

export class PhysicsWorld {
  private settleTimer = 0;
  events: PhysicsEvent[] = [];

  reset() { this.settleTimer = 0; this.events = []; }

  launch(piece: ArenaPiece, dx: number, dy: number, power: number) {
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) return false;
    const force = Math.min(1, Math.max(0, power));
    const strength = 7 + force * 6;
    piece.vx = (dx / distance) * strength;
    piece.vy = (dy / distance) * strength;
    piece.moving = true;
    return true;
  }

  step(pieces: ArenaPiece[], dt: number): boolean {
    this.events = [];
    let movingCount = 0;
    const collisionActivated = new Set<string>();

    for (const piece of pieces) {
      if (!piece.alive || !piece.moving) continue;
      movingCount += 1;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.vx *= Math.pow(PHYSICS.friction, dt * 60);
      piece.vy *= Math.pow(PHYSICS.friction, dt * 60);
      const currentSpeed = speed(piece);
      if (currentSpeed > PHYSICS.maxSpeed) { piece.vx *= PHYSICS.maxSpeed / currentSpeed; piece.vy *= PHYSICS.maxSpeed / currentSpeed; }
      clampPiece(piece);
    }

    for (let i = 0; i < pieces.length; i += 1) {
      const a = pieces[i]; if (!a.alive) continue;
      for (let j = i + 1; j < pieces.length; j += 1) {
        const b = pieces[j]; if (!b.alive) continue;
        let dx = b.x - a.x; let dy = b.y - a.y; const distance = Math.hypot(dx, dy); const minDistance = a.radius + b.radius;
        if (distance >= minDistance) continue;
        if (distance < 1e-6) { dx = 1; dy = 0; }
        const d = Math.max(1e-6, Math.hypot(dx, dy)); const nx = dx / d; const ny = dy / d;
        const overlap = minDistance + PHYSICS.separation - d;
        const invA = 1 / a.mass; const invB = 1 / b.mass; const total = invA + invB;
        a.x -= nx * overlap * invA / total; a.y -= ny * overlap * invA / total;
        b.x += nx * overlap * invB / total; b.y += ny * overlap * invB / total;
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        const impact = Math.max(0, -relative);
        if (relative < 0) {
          const restitution = PHYSICS.bounce;
          const impulse = (-(1 + restitution) * relative) / total;
          const ix = impulse * nx; const iy = impulse * ny;
          a.vx -= ix * invA; a.vy -= iy * invA; b.vx += ix * invB; b.vy += iy * invB;
          if (speed(a) > PHYSICS.impulseEpsilon) { a.moving = true; collisionActivated.add(a.id); }
          if (speed(b) > PHYSICS.impulseEpsilon) { b.moving = true; collisionActivated.add(b.id); }
        }
        if (impact >= PHYSICS.impactThreshold) {
          const damageA = damage(b, impact); const damageB = damage(a, impact);
          a.hp = Math.max(0, a.hp - damageA); b.hp = Math.max(0, b.hp - damageB);
          this.events.push({ type: "collision", a, b, impact, damageA, damageB });
          if (a.hp === 0 && a.alive) { a.alive = false; a.moving = false; a.vx = 0; a.vy = 0; this.events.push({ type: "destroyed", piece: a, killer: b.team }); }
          if (b.hp === 0 && b.alive) { b.alive = false; b.moving = false; b.vx = 0; b.vy = 0; this.events.push({ type: "destroyed", piece: b, killer: a.team }); }
        }
      }
    }

    for (const piece of pieces) {
      if (!piece.alive || !piece.moving) continue;
      // A piece newly activated by a collision must survive this frame so the
      // collision impulse becomes visible in the next integration step.
      if (!collisionActivated.has(piece.id) && speed(piece) < PHYSICS.minVelocity) {
        piece.vx = 0; piece.vy = 0; piece.moving = false;
      }
    }

    const active = pieces.some((piece) => piece.alive && piece.moving);
    if (!active && movingCount > 0) this.settleTimer += dt; else this.settleTimer = 0;
    if (!active && movingCount > 0 && this.settleTimer >= PHYSICS.settleDelay) { this.events.push({ type: "settled" }); this.settleTimer = 0; return true; }
    return false;
  }
}
