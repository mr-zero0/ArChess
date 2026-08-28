export type Team = "white" | "black";
export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

export type ArenaPiece = {
  id: string;
  type: PieceType;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  hp: number;
  maxHp: number;
  power: number;
  alive: boolean;
  moving: boolean;
};

export type ArenaSnapshot = {
  turn: Team;
  phase: "aim" | "aiming" | "physics" | "gameover";
  collisionCount: number;
  whiteHp: number;
  blackHp: number;
  winner: Team | null;
};

export const PIECE_STATS: Record<PieceType, Pick<ArenaPiece, "radius" | "mass" | "maxHp" | "power">> = {
  king: { radius: 0.34, mass: 6, maxHp: 120, power: 10 },
  queen: { radius: 0.30, mass: 5, maxHp: 75, power: 9 },
  rook: { radius: 0.30, mass: 5, maxHp: 80, power: 8 },
  bishop: { radius: 0.28, mass: 4, maxHp: 65, power: 8 },
  knight: { radius: 0.28, mass: 4, maxHp: 70, power: 8 },
  pawn: { radius: 0.25, mass: 2, maxHp: 45, power: 5 },
};
