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
  launchMul: number;
  friction: number;
  restitution: number;
  damageMul: number;
  collisionMul: number;
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

export type SelectedPiece = Pick<ArenaPiece, "id" | "type" | "team" | "hp" | "maxHp">;
