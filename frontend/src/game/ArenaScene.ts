import Phaser from "phaser";
import { createInitialPieces } from "./setup";
import { PhysicsWorld, PhysicsEvent } from "./physics";
import { ArenaPiece, Team } from "./types";

export type ArenaState = { turn: Team; phase: string; whiteHp: number; blackHp: number; collisions: number; winner: Team | null; message: string };
export type ArenaCallbacks = (state: ArenaState) => void;

const GLYPH: Record<ArenaPiece["type"], string> = { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" };
const SIZE = 640;
const CELL = SIZE / 8;

export class ArenaScene extends Phaser.Scene {
  private pieces: ArenaPiece[] = createInitialPieces();
  private sprites = new Map<string, Phaser.GameObjects.Text>();
  private physics = new PhysicsWorld();
  private turn: Team = "white";
  private phase = "aim";
  private selected: ArenaPiece | null = null;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private collisions = 0;
  private callbacks?: ArenaCallbacks;

  constructor() { super("ArenaScene"); }
  init(data: { onState?: ArenaCallbacks }) { this.callbacks = data.onState; }

  create() {
    this.drawBoard();
    for (const piece of this.pieces) this.addPiece(piece);
    this.input.on("pointerdown", this.handleDown, this);
    this.input.on("pointermove", this.handleMove, this);
    this.input.on("pointerup", this.handleUp, this);
    this.publish("White to move.");
  }

  update(_time: number, deltaMs: number) {
    if (this.phase !== "physics") return;
    const settled = this.physics.step(this.pieces, Math.min(0.033, deltaMs / 1000));
    for (const piece of this.pieces) this.syncPiece(piece);
    for (const event of this.physics.events) this.processPhysicsEvent(event);
    if (settled) {
      this.phase = "aim";
      this.turn = this.turn === "white" ? "black" : "white";
      this.publish(`${this.turn === "white" ? "White" : "Black"} to move.`);
    } else {
      this.publish();
    }
  }

  private drawBoard() {
    const g = this.add.graphics();
    for (let y=0;y<8;y++) for (let x=0;x<8;x++) { g.fillStyle((x+y)%2===0?0x2c3847:0x111923,1); g.fillRect(x*CELL,y*CELL,CELL,CELL); }
    g.lineStyle(3,0xa7b3c1,.35).strokeRect(0,0,SIZE,SIZE);
  }

  private addPiece(piece: ArenaPiece) {
    const sprite = this.add.text(piece.x * CELL, piece.y * CELL, GLYPH[piece.type], {
      fontFamily: "Georgia, serif", fontSize: `${Math.round(CELL*0.7)}px`, color: piece.team === "white" ? "#f7fbff" : "#05080c",
      stroke: piece.team === "white" ? "#172131" : "#dde6ef", strokeThickness: 5,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    sprite.setData("pieceId", piece.id); this.sprites.set(piece.id, sprite);
  }

  private syncPiece(piece: ArenaPiece) {
    const sprite = this.sprites.get(piece.id); if (!sprite) return;
    sprite.setVisible(piece.alive); sprite.setPosition(piece.x * CELL, piece.y * CELL);
  }

  private pieceAt(x: number, y: number) {
    let found: ArenaPiece | null = null; let best = CELL * .42;
    for (const piece of this.pieces) { if (!piece.alive) continue; const dx=piece.x*CELL-x,dy=piece.y*CELL-y,d=Math.hypot(dx,dy); if(d<best){best=d;found=piece;} }
    return found;
  }

  private handleDown(pointer: Phaser.Input.Pointer) {
    if (this.phase !== "aim") return;
    const piece = this.pieceAt(pointer.x,pointer.y);
    if (!piece || piece.team !== this.turn) return;
    this.selected = piece; this.dragStart = new Phaser.Math.Vector2(pointer.x,pointer.y);
    this.sprites.get(piece.id)?.setScale(1.12); this.publish(`Aiming ${piece.type}.`);
  }

  private handleMove(pointer: Phaser.Input.Pointer) {
    if (!this.selected || !this.dragStart) return;
    const sprite=this.sprites.get(this.selected.id); if(!sprite)return;
    const d=this.dragStart.distance(new Phaser.Math.Vector2(pointer.x,pointer.y)); sprite.setScale(1+Math.min(.15,d/500));
  }

  private handleUp(pointer: Phaser.Input.Pointer) {
    if (!this.selected || !this.dragStart) return;
    const piece=this.selected, start=this.dragStart, sprite=this.sprites.get(piece.id);
    this.selected=null;this.dragStart=null;sprite?.setScale(1);
    const drag=new Phaser.Math.Vector2(start.x-pointer.x,start.y-pointer.y); const d=drag.length();
    if(d<16){this.publish();return;}
    const power=Math.min(1,d/220); if(!this.physics.launch(piece,drag.x,drag.y,power))return;
    this.phase="physics"; this.collisions=0; this.physics.reset(); this.physics.launch(piece,drag.x,drag.y,power); this.publish("Physics resolving…");
  }

  private processPhysicsEvent(event: PhysicsEvent) {
    if(event.type==="collision"){this.collisions+=1; this.flashCollision(event.a,event.b,event.impact);}
    else if(event.type==="destroyed"){this.sprites.get(event.piece.id)?.setAlpha(.25);}
  }

  private flashCollision(a: ArenaPiece,b:ArenaPiece,impact:number){const x=(a.x+b.x)*CELL/2,y=(a.y+b.y)*CELL/2;const ring=this.add.circle(x,y,8,{stroke:0xffd37d,strokeThickness:4,fill:0xffffff,fillAlpha:0});this.tweens.add({targets:ring,radius:Math.min(70,16+impact*8),alpha:0,duration:220,onComplete:()=>ring.destroy()});}

  private publish(message="") {
    const whiteHp=this.pieces.filter(p=>p.team==="white"&&p.alive).reduce((s,p)=>s+p.hp,0);
    const blackHp=this.pieces.filter(p=>p.team==="black"&&p.alive).reduce((s,p)=>s+p.hp,0);
    const whiteKing=this.pieces.find(p=>p.team==="white"&&p.type==="king"); const blackKing=this.pieces.find(p=>p.team==="black"&&p.type==="king");
    const winner=!whiteKing?.alive?"black":!blackKing?.alive?"white":null;
    this.callbacks?.({turn:this.turn,phase:this.phase,whiteHp,blackHp,collisions:this.collisions,winner,message});
  }
}
