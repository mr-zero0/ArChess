"use strict";

window.InputController = class InputController {
  constructor(canvas, board, handlers) {
    this.canvas = canvas;
    this.board = board;
    this.handlers = handlers;
    this.activePointerId = null;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
  }

  onPointerDown(event) {
    if (event.button !== 0) return;
    const point = this.board.toWorld(event.clientX, event.clientY);
    if (!this.board.isInside(point)) return;

    event.preventDefault();
    if (this.handlers.pointerDown(point, event)) {
      this.activePointerId = event.pointerId;
      this.canvas.setPointerCapture?.(event.pointerId);
    }
  }

  onPointerMove(event) {
    if (this.activePointerId !== event.pointerId) return;
    event.preventDefault();
    this.handlers.pointerMove(this.board.toWorld(event.clientX, event.clientY), event);
  }

  onPointerUp(event) {
    if (this.activePointerId !== event.pointerId) return;
    event.preventDefault();
    this.handlers.pointerUp(this.board.toWorld(event.clientX, event.clientY), event);
    this.releasePointer(event.pointerId);
  }

  onPointerCancel(event) {
    if (this.activePointerId !== event.pointerId) return;
    this.handlers.pointerCancel(event);
    this.releasePointer(event.pointerId);
  }

  releasePointer(pointerId) {
    try {
      if (this.canvas.hasPointerCapture?.(pointerId)) this.canvas.releasePointerCapture(pointerId);
    } catch (_error) {
      // Pointer capture can disappear during a restart. Nothing useful to do here.
    }
    this.activePointerId = null;
  }

  cancel() {
    if (this.activePointerId !== null) this.releasePointer(this.activePointerId);
    this.handlers.pointerCancel();
  }
};
