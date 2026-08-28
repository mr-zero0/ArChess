import Phaser from "phaser";
import { createInitialPieces } from "./setup";
import { PhysicsWorld, PhysicsEvent } from "./physics";
import { ArenaPiece, Team } from "./types";

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

const GLYPH: Record<ArenaPiece["type"], string> = { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" };
const SIZE = 640;
const CELL = SIZE / 8;

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
  private lastPublished = "";

  constructor() { super("ArenaScene"); }
  init(data: { onState?: ArenaCallbacks }) { this.callbacks = data.onState; }

  create() {
    this.drawBoard();
    for (const piece of this.pieces) this.addPiece(piece);
    this.aimGuide = this.add.graphics().setDepth(1000);
    this.input.on("pointerdown", this.handleDown, this);
    this.input.on("pointermove", this.handleMove, this);
    this.input.on("pointerup", this.handleUp, this);
    this.input.on("pointerupoutside", this.handleUp, this);
    this.publish("White to move.", true);
  }

  update(_time: number, deltaMs: number) {
    if (this.phase !== "physics") return;
    const settled = this.world.step(this.pieces, Math.min(0.033, Math.max(0, deltaMs / 1000)));
    for (const piece of this.pieces) this.syncPiece(piece);
    for (const event of this.world.events) this.processPhysicsEvent(event);
    const winner = this.winner();
    if (winner) {
      this.phase = "gameover";
      this.publish(`${winner.toUpperCase()} wins.`, true);
      return;
    }
    if (settled) {
      this.phase = "aim";
      this.turn = this.turn === "white" ? "black" : "white";
      this.publish(`${this.turn === "white" ? "White" : "Black"} to move.`, true);
      return;
    }
    this.publish();
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
      fontFamily: "Georgia, serif",
      fontSize: `${Math.round(CELL * 0.7)}px`,
      color: piece.team === "white" ? "#f7fbff" : "#05080c",
      stroke: piece.team === "white" ? "#172131" : "#dde6ef",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
    sprite.setData("pieceId", piece.id);
    this.sprites.set(piece.id, sprite);

    const hp = this.add.text(piece.x * CELL, piece.y * CELL - CELL * 0.42, `${piece.hp}/${piece.maxHp}`, {
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20).setVisible(false);
    hp.setData("pieceId", piece.id);
    this.hpLabels.set(piece.id, hp);
  }

  private syncPiece(piece: ArenaPiece) {
    const sprite = this.sprites.get(piece.id);
    const hp = this.hpLabels.get(piece.id);
    const x = piece.x * CELL;
    const y = piece.y * CELL;
    if (sprite) sprite.setVisible(piece.alive).setPosition(x, y).setAlpha(piece.alive ? 1 : 0.2);
    if (hp) hp.setVisible(piece.alive && this.selected?.id === piece.id).setPosition(x, y - CELL * 0.42).setText(`${piece.hp}/${piece.maxHp}`);
  }

  private pointerWorld(pointer: Phaser.Input.Pointer) { return new Phaser.Math.Vector2(pointer.worldX, pointer.worldY); }

  private pieceAt(x: number, y: number) {
    let found: ArenaPiece | null = null;
    let best = CELL * 0.42;
    for (const piece of this.pieces) {
      if (!piece.alive) continue;
      const d = Math.hypot(piece.x * CELL - x, piece.y * CELL - y);
      if (d < best) { best = d; found = piece; }
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

  private clearAim() {
    this.aimGuide?.clear();
    if (this.selected) this.sprites.get(this.selected.id)?.setScale(1);
  }

  private handleUp(pointer: Phaser.Input.Pointer) {
    if (!this.selected || !this.dragStart || this.phase !== "aim" || this.selected.team !== this.turn) return;
    const piece = this.selected;
    const start = this.dragStart;
    const point = this.pointerWorld(pointer);
    this.selected = null;
    this.dragStart = null;
    this.clearAim();
    this.hpLabels.forEach((label) => label.setVisible(false));
    const drag = new Phaser.Math.Vector2(start.x - point.x, start.y - point.y);
    if (drag.length() < 16) { this.selectPiece(piece); return; }
    const power = Math.min(1, drag.length() / 220);
    if (!this.world.launch(piece, drag.x, drag.y, power)) return;
    this.phase = "physics";
    this.publish("Physics resolving…", true);
  }

  private processPhysicsEvent(event: PhysicsEvent) {
    if (event.type === "collision") {
      this.collisions += 1;
      this.flashCollision(event.a, event.b, event.impact);
      this.showDamage(event.a, event.damageA);
      this.showDamage(event.b, event.damageB);
      this.publish(`${event.a.type} -${event.damageA} HP · ${event.b.type} -${event.damageB} HP`, true);
    }
    if (event.type === "destroyed") this.publish(`${event.piece.type.toUpperCase()} destroyed.`, true);
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
    const whiteHp = this.pieces.filter((p) => p.team === "white" && p.alive).reduce((sum, p) => sum + p.hp, 0);
    const blackHp = this.pieces.filter((p) => p.team === "black" && p.alive).reduce((sum, p) => sum + p.hp, 0);
    const selectedPiece = this.selected && this.selected.alive ? { id: this.selected.id, type: this.selected.type, team: this.selected.team, hp: this.selected.hp, maxHp: this.selected.maxHp } : null;
    const state: ArenaState = { turn: this.turn, phase: this.phase, whiteHp, blackHp, collisions: this.collisions, winner: this.winner(), message, selectedPiece };
    const key = JSON.stringify(state);
    if (!force && key === this.lastPublished) return;
    this.lastPublished = key;
    this.callbacks?.(state);
  }
}
