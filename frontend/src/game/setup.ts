import { ArenaPiece, PIECE_STATS, PieceType, Team } from "./types";

const BACK_RANK: PieceType[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

export function createInitialPieces(): ArenaPiece[] {
  const pieces: ArenaPiece[] = [];
  const add = (type: PieceType, team: Team, x: number, y: number, index: number) => {
    const stats = PIECE_STATS[type];
    pieces.push({ id: `${team}-${type}-${index}`, type, team, x: x + 0.5, y: y + 0.5, vx: 0, vy: 0, radius: stats.radius, mass: stats.mass, hp: stats.maxHp, maxHp: stats.maxHp, power: stats.power, alive: true, moving: false });
  };
  BACK_RANK.forEach((type, x) => add(type, "white", x, 7, x));
  for (let x = 0; x < 8; x += 1) add("pawn", "white", x, 6, x);
  BACK_RANK.forEach((type, x) => add(type, "black", x, 0, x));
  for (let x = 0; x < 8; x += 1) add("pawn", "black", x, 1, x);
  return pieces;
}
