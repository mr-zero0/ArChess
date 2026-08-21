"use strict";

window.GameBoard = class GameBoard {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.logicalSize = GAME_CONFIG.boardSize;
    this.pixelSize = 1;
    this.dpr = 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.pixelSize = Math.max(1, Math.round(Math.min(rect.width, rect.height || rect.width)));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const target = Math.max(1, Math.round(this.pixelSize * this.dpr));
    if (this.canvas.width !== target || this.canvas.height !== target) {
      this.canvas.width = target;
      this.canvas.height = target;
    }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  get cellSize() {
    return this.pixelSize / this.logicalSize;
  }

  toWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.logicalSize,
      y: ((clientY - rect.top) / rect.height) * this.logicalSize,
    };
  }

  isInside(point) {
    return point.x >= 0 && point.y >= 0 && point.x <= this.logicalSize && point.y <= this.logicalSize;
  }

  toPixels(value) {
    return value * this.cellSize;
  }
};
