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
const BOARD_UNITS = 8;
const MAX_DRAG_DISTANCE = 2.6;
const PIECE_HIT_RADIUS = CELL * 0.55;
const MIN_DRAG_DISTANCE_PIXELS = 12;

type CanvasPointerEvent = PointerEvent;

export class ArenaScene extends Phaser.Scene {
  private pieces: ArenaPiece[] = createInitialPieces();
  private sprites = new Map<string, Phaser.GameObjects.Text>();
  private hpLabels = new Map<string, Phaser.GameObjects.Text>();
  private world = new PhysicsWorld();
  private turn: Team = "white";
  private phase = "aim";
  private selected: ArenaPiece | null = null;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private dragPointerId: number | null = null;
  private aimGuide?: Phaser.GameObjects.Graphics;
  private collisions = 0;
  private callbacks?: ArenaCallbacks;
  private onLaunch?: ArenaLaunchHandler;
  private pendingAuthoritativeSnapshot: AuthoritativeSnapshot | null = null;
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
    this.attachCanvasInput();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.detachCanvasInput, this);
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

    if (!settled) {
      this.publish();
      return;
    }

    this.phase = "aim";
    if (this.pendingAuthoritativeSnapshot) {
      const snapshot = this.pendingAuthoritativeSnapshot;
      this.pendingAuthoritativeSnapshot = null;
      logger.debug("AUTHORITATIVE_SNAPSHOT_RECONCILING_AFTER_LOCAL_SETTLE", { turn: snapshot.currentTeam, gameOver: snapshot.gameOver });
      this.applySnapshotNow(snapshot);
      return;
    }

    const previousTurn = this.turn;
    this.turn = this.turn === "white" ? "black" : "white";
    logger.debug("TURN_SETTLED", { previousTurn, nextTurn: this.turn, collisions: this.collisions });
    this.publish(`${this.turn === "white" ? "White" : "Black"} to move.`, true);
  }

  applyAuthoritativeSnapshot(snapshot: AuthoritativeSnapshot): ArenaState {
    if (this.phase === "physics") {
      this.pendingAuthoritativeSnapshot = snapshot;
      logger.debug("AUTHORITATIVE_SNAPSHOT_DEFERRED_DURING_PHYSICS", { turn: snapshot.currentTeam, gameOver: snapshot.gameOver });
      return this.currentState("Physics resolving…");
    }
    return this.applySnapshotNow(snapshot);
  }

  private applySnapshotNow(snapshot: AuthoritativeSnapshot): ArenaState {
    const byId = new Map(snapshot.pieces.map((piece) => [piece.id, piece]));
    let missingPieces = 0;
    for (const piece of this.pieces) {
      const remote = byId.get(piece.id);
      if (!remote) { missingPieces += 1; continue; }
      piece.x = remote.x;
      piece.y = remote.y;
      piece.vx = remote.vx;
      piece.vy = remote.vy;
      piece.hp = remote.hp;
      piece.alive = remote.alive;
      piece.moving = remote.alive && Math.hypot(remote.vx, remote.vy) > 0;
      this.syncPiece(piece);
    }
    if (missingPieces) logger.warn("AUTHORITATIVE_PIECES_MISSING", { missingPieces, localPieceCount: this.pieces.length, remotePieceCount: snapshot.pieces.length });
    this.world.reset();
    this.pendingAuthoritativeSnapshot = null;
    this.turn = snapshot.currentTeam;
    this.phase = snapshot.gameOver ? "gameover" : "aim";
    this.clearDragState();
    this.selectPiece(null);
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
    }).setOrigin(0.5).setDepth(10);
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

  private canvasPoint(event: CanvasPointerEvent): Phaser.Math.Vector2 | null {
    const canvas = this.game.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((event.clientX - rect.left) / rect.width) * SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE;
    return new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 0, SIZE), Phaser.Math.Clamp(y, 0, SIZE));
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

  private attachCanvasInput() {
    const canvas = this.game.canvas;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.handleCanvasPointerDown);
    canvas.addEventListener("pointermove", this.handleCanvasPointerMove);
    canvas.addEventListener("pointerup", this.handleCanvasPointerUp);
    canvas.addEventListener("pointercancel", this.handleCanvasPointerCancel);
    logger.debug("CANVAS_POINTER_INPUT_ATTACHED", { touchAction: canvas.style.touchAction });
  }

  private detachCanvasInput() {
    const canvas = this.game.canvas;
    canvas.removeEventListener("pointerdown", this.handleCanvasPointerDown);
    canvas.removeEventListener("pointermove", this.handleCanvasPointerMove);
    canvas.removeEventListener("pointerup", this.handleCanvasPointerUp);
    canvas.removeEventListener("pointercancel", this.handleCanvasPointerCancel);
    if (this.dragPointerId !== null && canvas.hasPointerCapture(this.dragPointerId)) canvas.releasePointerCapture(this.dragPointerId);
    this.dragPointerId = null;
    this.clearDragState();
  }

  private readonly handleCanvasPointerDown = (event: CanvasPointerEvent) => {
    if (this.phase !== "aim" || (event.pointerType === "mouse" && event.button !== 0) || this.dragPointerId !== null) return;
    const point = this.canvasPoint(event);
    if (!point) return;
    const piece = this.pieceAt(point.x, point.y);
    if (!piece || piece.team !== this.turn) {
      this.selectPiece(null);
      return;
    }
    event.preventDefault();
    this.selectPiece(piece);
    this.dragStart = point.clone();
    this.dragPointerId = event.pointerId;
    try { this.game.canvas.setPointerCapture(event.pointerId); } catch { /* capture unsupported */ }
    this.sprites.get(piece.id)?.setScale(1.12);
    this.drawAim(point);
    this.publish(`Aiming ${piece.type}.`, true);
    logger.debug("DRAG_STARTED", { pieceId: piece.id, team: piece.team, pointerId: event.pointerId, x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)) });
  };

  private readonly handleCanvasPointerMove = (event: CanvasPointerEvent) => {
    if (this.dragPointerId !== event.pointerId || !this.selected || !this.dragStart || this.phase !== "aim") return;
    const point = this.canvasPoint(event);
    if (!point) return;
    event.preventDefault();
    this.drawAim(point);
  };

  private readonly handleCanvasPointerUp = (event: CanvasPointerEvent) => {
    if (this.dragPointerId !== event.pointerId) return;
    const point = this.canvasPoint(event);
    if (!point) { this.cancelCanvasDrag("invalid_pointer_position"); return; }
    event.preventDefault();
    this.finishDrag(point);
    try { this.game.canvas.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    this.dragPointerId = null;
  };

  private readonly handleCanvasPointerCancel = (event: CanvasPointerEvent) => {
    if (this.dragPointerId !== event.pointerId) return;
    this.cancelCanvasDrag("pointer_cancel");
    try { this.game.canvas.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    this.dragPointerId = null;
  };

  private cancelCanvasDrag(reason: string) {
    logger.debug("DRAG_CANCELLED", { pieceId: this.selected?.id ?? null, reason });
    this.clearDragState();
    this.selectPiece(null);
    this.dragPointerId = null;
  }

  private finishDrag(point: Phaser.Math.Vector2) {
    if (!this.selected || !this.dragStart || this.phase !== "aim" || this.selected.team !== this.turn) return;
    const piece = this.selected;
    const start = this.dragStart;
    const dragPixels = new Phaser.Math.Vector2(start.x - point.x, start.y - point.y);
    this.clearDragState();
    this.selected = null;
    this.hpLabels.forEach((label) => label.setVisible(false));
    if (dragPixels.length() < MIN_DRAG_DISTANCE_PIXELS) { this.selectPiece(piece); return; }

    const dragBoard = dragPixels.clone().scale(BOARD_UNITS / SIZE);
    const boardDistance = Math.min(MAX_DRAG_DISTANCE, dragBoard.length());
    const power = Math.min(1, boardDistance / MAX_DRAG_DISTANCE);
    if (!this.world.launch(piece, dragBoard.x, dragBoard.y, power)) { this.selectPiece(piece); return; }

    this.pendingAuthoritativeSnapshot = null;
    logger.info("LOCAL_LAUNCH_STARTED", {
      pieceId: piece.id,
      team: piece.team,
      dragPixelsX: Number(dragPixels.x.toFixed(2)),
      dragPixelsY: Number(dragPixels.y.toFixed(2)),
      dragBoardX: Number(dragBoard.x.toFixed(3)),
      dragBoardY: Number(dragBoard.y.toFixed(3)),
      dragBoardDistance: Number(boardDistance.toFixed(3)),
      power: Number(power.toFixed(3)),
    });
    this.phase = "physics";
    this.publish("Physics resolving…", true);
    if (this.onLaunch) {
      void Promise.resolve(this.onLaunch({ team: piece.team, pieceId: piece.id, dx: dragBoard.x, dy: dragBoard.y })).catch((error) => {
        logger.warn("AUTHORITATIVE_LAUNCH_ERROR", { pieceId: piece.id, error: error instanceof Error ? error.message : String(error) });
      });
    }
  }

  private selectPiece(piece: ArenaPiece | null) {
    if (this.selected && this.selected.id !== piece?.id) this.sprites.get(this.selected.id)?.setScale(1);
    this.selected = piece;
    for (const current of this.pieces) this.hpLabels.get(current.id)?.setVisible(Boolean(piece && current.id === piece.id && current.alive));
    this.publish(piece ? `${piece.type} selected.` : "", true);
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

  private processPhysicsEvent(event: PhysicsEvent) {
    if (event.type === "collision") {
      this.collisions += 1;
      this.flashCollision(event.a, event.b, event.impact);
      this.showDamage(event.a, event.damageA);
      this.showDamage(event.b, event.damageB);
      logger.debug("COLLISION", { pieceA: event.a.id, pieceB: event.b.id, impact: Number(event.impact.toFixed(3)), damageA: event.damageA, damageB: event.damageB });
      this.publish(`${event.a.type} -${event.damageA} HP · ${event.b.type} -${event.damageB} HP`, true);
    }
    if (event.type === "destroyed") {
      logger.info("PIECE_DESTROYED", { pieceId: event.piece.id, pieceType: event.piece.type, killer: event.killer });
      this.publish(`${event.piece.type.toUpperCase()} destroyed.`, true);
    }
  }

  private showDamage(piece: ArenaPiece, amount: number) {
    const text = this.add.text(piece.x * CELL, piece.y * CELL, `-${Math.max(0, Math.round(amount))}`, {
      fontFamily: "Arial, sans-serif", fontSize: "22px", color: "#ff6875", stroke: "#18080b", strokeThickness: 5, fontStyle: "bold",
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: text, y: text.y - 26, alpha: 0, duration: 500, ease: "Cubic.easeOut", onComplete: () => text.destroy() });
  }

  private flashCollision(a: ArenaPiece, b: ArenaPiece, impact: number) {
    const x = ((a.x + b.x) * CELL) / 2;
    const y = ((a.y + b.y) * CELL) / 2;
    const ring = this.add.circle(x, y, 8, 0xffffff, 0);
    ring.setStrokeStyle(4, 0xffd37d, 1);
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
