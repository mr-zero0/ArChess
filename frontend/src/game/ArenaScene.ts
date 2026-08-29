import Phaser from "phaser";
import { createInitialPieces } from "./setup";
import { PhysicsWorld, PhysicsEvent } from "./physics";
import type { ArenaPiece, Team } from "./types";
import type { AuthoritativeSnapshot } from "../api/client.ts";
import { createLogger } from "../observability.ts";

const logger = createLogger("game.arena");

export type LaunchPayload = { team: Team; pieceId: string; dx: number; dy: number };
export type ArenaState = {
  turn: Team;
  phase: string;
  whiteHp: number;
  blackHp: number;
  collisions: number;
  winner: Team | null;
  message: string;
  selectedPiece: { id: string; type: ArenaPiece["type"]; team: Team; hp: number; maxHp: number } | null;
};
export type ArenaCallbacks = (state: ArenaState) => void;
export type ArenaLaunchHandler = (payload: LaunchPayload) => Promise<unknown> | unknown;

const GLYPH: Record<ArenaPiece["type"], string> = { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" };
const SIZE = 640;
const CELL = SIZE / 8;
const PIECE_HIT_RADIUS = CELL * 0.48;
const MIN_DRAG_DISTANCE = 16;

export class ArenaScene extends Phaser.Scene {
  private pieces: ArenaPiece[] = createInitialPieces();
  private sprites = new Map<string, Phaser.GameObjects.Text>();
  private hpLabels = new Map<string, Phaser.GameObjects.Text>();
  private world = new PhysicsWorld();
  private turn: Team = "white";
  private phase = "aim";
  private selected: ArenaPiece | null = null;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private aimGuide?: Phaser.GameObjects.Graphics;
  private collisions = 0;
  private callbacks?: ArenaCallbacks;
  private onLaunch?: ArenaLaunchHandler;
  private lastPublished = "";

  constructor() { super("ArenaScene"); }

  init(data: { onState?: ArenaCallbacks; onLaunch?: ArenaLaunchHandler }) {
    this.callbacks = data.onState;
    this.onLaunch = data.onLaunch;
    logger.debug("ARENA_INITIALIZED", { callbackAttached: Boolean(data.onState), launchHandlerAttached: Boolean(data.onLaunch), pieceCount: this.pieces.length });
  }

  create() {
    this.drawBoard();
    for (const piece of this.pieces) this.addPiece(piece);
    this.aimGuide = this.add.graphics().setDepth(1000);
    this.input.on("pointerdown", this.handleDown, this);
    this.input.on("pointermove", this.handleMove, this);
    this.input.on("pointerup", this.handleUp, this);
    this.input.on("pointerupoutside", this.handleUp, this);
    this.input.on("gameout", this.handlePointerCancel, this);
    this.publish("White to move.", true);
    logger.info("ARENA_READY", { turn: this.turn, pieceCount: this.pieces.length });
  }

  update(_time: number, deltaMs: number) {
    if (this.phase !== "physics") return;
    const settled = this.world.step(this.pieces, Math.min(0.033, Math.max(0, deltaMs / 1000)));
    for (const piece of this.pieces) this.syncPiece(piece);
    for (const event of this.world.events) this.processPhysicsEvent(event);
    const winner = this.winner();
    if (winner) {
      this.phase = "gameover";
      logger.info("ARENA_GAME_OVER", { winner, collisions: this.collisions });
      this.publish(`${winner.toUpperCase()} wins.`, true);
      return;
    }
    if (settled) {
      const previousTurn = this.turn;
      this.phase = "aim";
      this.turn = this.turn === "white" ? "black" : "white";
      logger.debug("TURN_SETTLED", { previousTurn, nextTurn: this.turn, collisions: this.collisions });
      this.publish(`${this.turn === "white" ? "White" : "Black"} to move.`, true);
      return;
    }
    this.publish();
  }

  applyAuthoritativeSnapshot(snapshot: AuthoritativeSnapshot): ArenaState {
    const byId = new Map(snapshot.pieces.map((piece) => [piece.id, piece]));
    for (const piece of this.pieces) {
      const remote = byId.get(piece.id);
      if (!remote) continue;
      piece.x = remote.x;
      piece.y = remote.y;
      piece.vx = remote.vx;
      piece.vy = remote.vy;
      piece.hp = remote.hp;
      piece.alive = remote.alive;
      piece.moving = remote.alive && Math.hypot(remote.vx, remote.vy) > 0;
      this.syncPiece(piece);
    }
    this.world.reset();
    this.turn = snapshot.currentTeam;
    this.phase = snapshot.gameOver ? "gameover" : "aim";
    this.clearDragState();
    if (!this.selected?.alive) this.selectPiece(null);
    const message = snapshot.gameOver ? `${this.winner()?.toUpperCase() ?? "GAME"} wins.` : `${this.turn === "white" ? "White" : "Black"} to move.`;
    logger.info("AUTHORITATIVE_SNAPSHOT_APPLIED", { turn: this.turn, gameOver: snapshot.gameOver, pieceCount: snapshot.pieces.length });
    this.publish(message, true);
    return this.currentState(message);
  }

  private currentState(message = ""): ArenaState {
    const whiteHp = this.pieces.filter((p) => p.team === "white" && p.alive).reduce((sum, p) => sum + p.hp, 0);
    const blackHp = this.pieces.filter((p) => p.team === "black" && p.alive).reduce((sum, p) => sum + p.hp, 0);
    const selectedPiece = this.selected && this.selected.alive ? { id: this.selected.id, type: this.selected.type, team: this.selected.team, hp: this.selected.hp, maxHp: this.selected.maxHp } : null;
    return { turn: this.turn, phase: this.phase, whiteHp, blackHp, collisions: this.collisions, winner: this.winner(), message, selectedPiece };
  }

  private drawBoard() {
    const g = this.add.graphics();
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) {
      g.fillStyle((x + y) % 2 === 0 ? 0x2c3847 : 0x111923, 1);
      g.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
    g.lineStyle(3, 0xa7b3c1, 0.35).strokeRect(0, 0, SIZE, SIZE);
  }

  private addPiece(piece: ArenaPiece) {
    const sprite = this.add.text(piece.x * CELL, piece.y * CELL, GLYPH[piece.type], {
      fontFamily: "Georgia, serif", fontSize: `${Math.round(CELL * 0.7)}px`,
      color: piece.team === "white" ? "#f7fbff" : "#05080c", stroke: piece.team === "white" ? "#172131" : "#dde6ef", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
    sprite.setData("pieceId", piece.id);
    this.sprites.set(piece.id, sprite);
    const hp = this.add.text(piece.x * CELL, piece.y * CELL - CELL * 0.42, `${piece.hp}/${piece.maxHp}`, {
      fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#ffffff", stroke: "#000000", strokeThickness: 4, fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20).setVisible(false);
    hp.setData("pieceId", piece.id);
    this.hpLabels.set(piece.id, hp);
  }

  private syncPiece(piece: ArenaPiece) {
    const sprite = this.sprites.get(piece.id); const hp = this.hpLabels.get(piece.id);
    const x = piece.x * CELL; const y = piece.y * CELL;
    if (sprite) sprite.setVisible(piece.alive).setPosition(x, y).setAlpha(piece.alive ? 1 : 0.2);
    if (hp) hp.setVisible(piece.alive && this.selected?.id === piece.id).setPosition(x, y - CELL * 0.42).setText(`${piece.hp}/${piece.maxHp}`);
  }

  private pointerWorld(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
  }

  private pieceAt(x: number, y: number) {
    let found: ArenaPiece | null = null;
    let best = PIECE_HIT_RADIUS;
    for (const piece of this.pieces) {
      if (!piece.alive) continue;
      const d = Math.hypot(piece.x * CELL - x, piece.y * CELL - y);
      if (d <= best) { best = d; found = piece; }
    }
    return found;
  }

  private handleDown(pointer: Phaser.Input.Pointer) {
    if (this.phase !== "aim") return;
    const point = this.pointerWorld(pointer);
    const piece = this.pieceAt(point.x, point.y);
    this.selectPiece(piece);
    if (!piece || piece.team !== this.turn) return;
    this.dragStart = point.clone();
    this.sprites.get(piece.id)?.setScale(1.12);
    this.drawAim(point);
    this.publish(`Aiming ${piece.type}.`, true);
    logger.debug("DRAG_STARTED", { pieceId: piece.id, team: piece.team, x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)) });
  }

  private selectPiece(piece: ArenaPiece | null) {
    if (this.selected && this.selected.id !== piece?.id) this.sprites.get(this.selected.id)?.setScale(1);
    this.selected = piece;
    for (const current of this.pieces) this.hpLabels.get(current.id)?.setVisible(Boolean(piece && current.id === piece.id && current.alive));
    this.publish(piece ? `${piece.type} selected.` : "", true);
  }

  private handleMove(pointer: Phaser.Input.Pointer) {
    if (!this.selected || !this.dragStart || this.phase !== "aim" || this.selected.team !== this.turn) return;
    const point = this.pointerWorld(pointer);
    const d = this.dragStart.distance(point);
    this.sprites.get(this.selected.id)?.setScale(1 + Math.min(0.15, d / 500));
    this.drawAim(point);
  }

  private drawAim(pointerPoint: Phaser.Math.Vector2) {
    if (!this.aimGuide || !this.selected || !this.dragStart) return;
    this.aimGuide.clear();
    const piecePoint = new Phaser.Math.Vector2(this.selected.x * CELL, this.selected.y * CELL);
    const dx = this.dragStart.x - pointerPoint.x;
    const dy = this.dragStart.y - pointerPoint.y;
    const length = Math.hypot(dx, dy);
    if (length < 4) return;
    const scale = Math.min(0.75, 220 / length);
    this.aimGuide.lineStyle(5, 0x7ee7ff, 0.9);
    this.aimGuide.beginPath();
    this.aimGuide.moveTo(piecePoint.x, piecePoint.y);
    this.aimGuide.lineTo(piecePoint.x + dx * scale, piecePoint.y + dy * scale);
    this.aimGuide.strokePath();
  }

  private clearDragState() {
    this.aimGuide?.clear();
    if (this.selected) this.sprites.get(this.selected.id)?.setScale(1);
    this.dragStart = null;
  }

  private clearAim() {
    this.aimGuide?.clear();
    if (this.selected) this.sprites.get(this.selected.id)?.setScale(1);
  }

  private handlePointerCancel() {
    if (!this.dragStart) return;
    logger.debug("DRAG_CANCELLED", { pieceId: this.selected?.id ?? null });
    this.clearDragState();
  }

  private handleUp(pointer: Phaser.Input.Pointer) {
    if (!this.selected || !this.dragStart || this.phase !== "aim" || this.selected.team !== this.turn) return;
    const piece = this.selected;
    const start = this.dragStart;
    const point = this.pointerWorld(pointer);
    const drag = new Phaser.Math.Vector2(start.x - point.x, start.y - point.y);
    this.clearDragState();
    this.selected = null;
    this.hpLabels.forEach((label) => label.setVisible(false));
    if (drag.length() < MIN_DRAG_DISTANCE) { this.selectPiece(piece); return; }
    const power = Math.min(1, drag.length() / 220);
    if (!this.world.launch(piece, drag.x, drag.y, power)) {
      this.selectPiece(piece);
      return;
    }
    logger.info("LOCAL_LAUNCH_STARTED", { pieceId: piece.id, team: piece.team, dragLength: Number(drag.length().toFixed(3)), power: Number(power.toFixed(3)) });
    this.phase = "physics";
    this.publish("Physics resolving…", true);
    if (this.onLaunch) {
      void Promise.resolve(this.onLaunch({ team: piece.team, pieceId: piece.id, dx: drag.x, dy: drag.y })).catch((error) => {
        logger.warn("AUTHORITATIVE_LAUNCH_ERROR", { pieceId: piece.id, error: error instanceof Error ? error.message : String(error) });
      });
    }
  }

  private processPhysicsEvent(event: PhysicsEvent) {
    if (event.type === "collision") {
      this.collisions += 1; this.flashCollision(event.a, event.b, event.impact); this.showDamage(event.a, event.damageA); this.showDamage(event.b, event.damageB);
      logger.debug("COLLISION", { pieceA: event.a.id, pieceB: event.b.id, impact: Number(event.impact.toFixed(3)), damageA: event.damageA, damageB: event.damageB });
      this.publish(`${event.a.type} -${event.damageA} HP · ${event.b.type} -${event.damageB} HP`, true);
    }
    if (event.type === "destroyed") {
      logger.info("PIECE_DESTROYED", { pieceId: event.piece.id, pieceType: event.piece.type, killer: event.killer });
      this.publish(`${event.piece.type.toUpperCase()} destroyed.`, true);
    }
  }

  private showDamage(piece: ArenaPiece, amount: number) {
    const text = this.add.text(piece.x * CELL, piece.y * CELL, `-${Math.max(0, Math.round(amount))}`, { fontFamily: "Arial, sans-serif", fontSize: "22px", color: "#ff6875", stroke: "#18080b", strokeThickness: 5, fontStyle: "bold" }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: text, y: text.y - 26, alpha: 0, duration: 500, ease: "Cubic.easeOut", onComplete: () => text.destroy() });
  }

  private flashCollision(a: ArenaPiece, b: ArenaPiece, impact: number) {
    const x = ((a.x + b.x) * CELL) / 2; const y = ((a.y + b.y) * CELL) / 2; const ring = this.add.circle(x, y, 8, 0xffffff, 0); ring.setStrokeStyle(4, 0xffd37d, 1);
    this.tweens.add({ targets: ring, radius: Math.min(70, 16 + impact * 8), alpha: 0, duration: 220, onComplete: () => ring.destroy() });
  }

  private winner(): Team | null {
    const whiteKing = this.pieces.find((piece) => piece.team === "white" && piece.type === "king");
    const blackKing = this.pieces.find((piece) => piece.team === "black" && piece.type === "king");
    return !whiteKing?.alive ? "black" : !blackKing?.alive ? "white" : null;
  }

  private publish(message = "", force = false) {
    const state = this.currentState(message);
    const key = JSON.stringify(state);
    if (!force && key === this.lastPublished) return;
    this.lastPublished = key;
    this.callbacks?.(state);
  }
}
