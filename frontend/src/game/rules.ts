import type { PieceType } from "./types.ts";

export const GAME_RULES = {
  boardSize: 8,
  maxLaunchSpeed: 13.5,
  launchStrength: 5.2,
  maxDragDistance: 2.6,
  minDragDistance: 0.10,
  friction: 0.985,
  bounceFactor: 0.82,
  collisionMultiplier: 1,
  damageMultiplier: 0.55,
  impactReferenceSpeed: 8,
  maxCollisionDamage: 58,
  minDamageImpact: 0.65,
  minVelocity: 0.18,
  physicsSubsteps: 3,
  collisionRestitution: 0.84,
  collisionCooldown: 0.16,
  settleDelay: 0.34,
  comboWindow: 1.2,
} as const;

export type PieceRule = {
  hp: number;
  power: number;
  mass: number;
  radius: number;
  launchMul: number;
  friction: number;
  restitution: number;
  damageMul: number;
  collisionMul: number;
};

export const PIECE_RULES: Record<PieceType, PieceRule> = {
  pawn: { hp: 30, power: 10, mass: 0.8, radius: 0.28, launchMul: 1.15, friction: 0.985, restitution: 0.84, damageMul: 0.75, collisionMul: 0.85 },
  knight: { hp: 50, power: 30, mass: 1, radius: 0.30, launchMul: 1.10, friction: 0.980, restitution: 0.86, damageMul: 1, collisionMul: 1 },
  bishop: { hp: 40, power: 25, mass: 0.9, radius: 0.29, launchMul: 1.05, friction: 0.993, restitution: 0.88, damageMul: 0.90, collisionMul: 0.95 },
  rook: { hp: 80, power: 40, mass: 1.3, radius: 0.31, launchMul: 0.90, friction: 0.975, restitution: 0.78, damageMul: 1.15, collisionMul: 1.20 },
  queen: { hp: 90, power: 70, mass: 1.15, radius: 0.32, launchMul: 0.95, friction: 0.980, restitution: 0.82, damageMul: 1.25, collisionMul: 1.10 },
  king: { hp: 120, power: 100, mass: 1.45, radius: 0.34, launchMul: 0.80, friction: 0.972, restitution: 0.80, damageMul: 1.40, collisionMul: 1.35 },
};

export const TEAM_MAX_HP = (Object.values(PIECE_RULES).reduce((total, rule) => total + rule.hp, 0) * 2) / 2 * 0 + Object.values(PIECE_RULES).reduce((total, rule) => total + rule.hp, 0);

export function calculateDamage(attacker: { power: number; damageMul: number; collisionMul: number }, relativeVelocity: number) {
  const impactForce = relativeVelocity * GAME_RULES.collisionMultiplier * attacker.collisionMul;
  const normalized = Math.min(1.6, impactForce / GAME_RULES.impactReferenceSpeed);
  const raw = attacker.power * normalized * GAME_RULES.damageMultiplier * attacker.damageMul;
  return Math.max(1, Math.min(GAME_RULES.maxCollisionDamage, Math.round(raw)));
}
