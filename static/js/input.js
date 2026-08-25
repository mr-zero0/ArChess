"use strict";

window.InputController = class InputController {
  constructor(canvas, board, handlers) {
    this.canvas = canvas;
    this.board = board;
    this.handlers = handlers;
    this.activePointerId = null;
    window.__ArChessLocalInputController = this;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
    this.onLostPointerCapture = this.onLostPointerCapture.bind(this);

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", this.onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", this.onPointerUp, { passive: false });
    canvas.addEventListener("pointercancel", this.onPointerCancel, { passive: false });
    canvas.addEventListener("lostpointercapture", this.onLostPointerCapture);
  }

  onPointerDown(event) {
    if (event.button !== 0 || this.activePointerId !== null) return;
    const point = this.board.toWorld(event.clientX, event.clientY);
    if (!this.board.isInside(point)) return;
    event.preventDefault();
    if (this.handlers.pointerDown(point, event)) {
      this.activePointerId = event.pointerId;
      try { this.canvas.setPointerCapture?.(event.pointerId); } catch (_) {}
    }
  }

  onPointerMove(event) {
    if (this.activePointerId !== event.pointerId) return;
    event.preventDefault();
    const point = this.board.toWorld(event.clientX, event.clientY);
    if (this.board.isInside(point)) this.handlers.pointerMove(point, event);
  }

  onPointerUp(event) {
    if (this.activePointerId !== event.pointerId) return;
    event.preventDefault();
    this.handlers.pointerUp(this.board.toWorld(event.clientX, event.clientY), event);
    this.releasePointer(event.pointerId);
  }

  onPointerCancel(event) {
    if (this.activePointerId !== event.pointerId) return;
    event.preventDefault();
    this.handlers.pointerCancel(event);
    this.releasePointer(event.pointerId);
  }

  onLostPointerCapture(event) {
    if (this.activePointerId !== event.pointerId) return;
    this.handlers.pointerCancel?.(event);
    this.activePointerId = null;
  }

  releasePointer(pointerId) {
    try {
      if (this.canvas.hasPointerCapture?.(pointerId)) this.canvas.releasePointerCapture(pointerId);
    } catch (_) {}
    this.activePointerId = null;
  }

  cancel() {
    if (this.activePointerId !== null) this.releasePointer(this.activePointerId);
    this.handlers.pointerCancel?.();
  }
};
