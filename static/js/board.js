"use strict";

window.GameBoard = class GameBoard {
  constructor(canvas) {
    try {
      if (!canvas) throw new Error("Game canvas is missing");
      this.canvas = canvas; this.ctx = canvas.getContext("2d", { alpha:false });
      if (!this.ctx) throw new Error("2D canvas context is unavailable");
      this.logicalSize = window.GAME_CONFIG?.boardSize || 8; this.pixelSize = 1; this.dpr = 1; this.resize();
      window.ArChessLog?.("BOARD_READY", { logicalSize:this.logicalSize });
    } catch (error) { window.ArChessObservability?.error?.("BOARD_INIT_ERROR", error); throw error; }
  }

  resize() {
    try {
      const rect = this.canvas.getBoundingClientRect();
      const side = Math.min(rect.width, rect.height || rect.width);
      this.pixelSize = Math.max(1, Math.round(side));
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      const target = Math.max(1, Math.round(this.pixelSize * this.dpr));
      if (this.canvas.width !== target || this.canvas.height !== target) { this.canvas.width = target; this.canvas.height = target; }
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    } catch (error) { window.ArChessObservability?.error?.("BOARD_RESIZE_ERROR", error); }
  }

  get cellSize() { return this.pixelSize / this.logicalSize; }

  toWorld(clientX, clientY) {
    try {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) throw new Error("Canvas has zero display size");
      return { x:((clientX-rect.left)/rect.width)*this.logicalSize, y:((clientY-rect.top)/rect.height)*this.logicalSize };
    } catch (error) { window.ArChessObservability?.error?.("COORDINATE_CONVERSION_ERROR", error); return { x:-1, y:-1 }; }
  }

  isInside(point) { return Boolean(point) && point.x>=0 && point.y>=0 && point.x<=this.logicalSize && point.y<=this.logicalSize; }
  toPixels(value) { return value*this.cellSize; }
};
