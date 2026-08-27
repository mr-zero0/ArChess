"use strict";

window.InputController = class InputController {
  constructor(canvas, board, handlers) {
    try {
      this.canvas = canvas; this.board = board; this.handlers = handlers; this.activePointerId = null;
      window.__ArChessLocalInputController = this;
      this.onPointerDown = this.onPointerDown.bind(this); this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this); this.onPointerCancel = this.onPointerCancel.bind(this); this.onLostPointerCapture = this.onLostPointerCapture.bind(this);
      canvas.style.touchAction = "none";
      canvas.addEventListener("pointerdown", this.onPointerDown, { passive:false });
      canvas.addEventListener("pointermove", this.onPointerMove, { passive:false });
      canvas.addEventListener("pointerup", this.onPointerUp, { passive:false });
      canvas.addEventListener("pointercancel", this.onPointerCancel, { passive:false });
      canvas.addEventListener("lostpointercapture", this.onLostPointerCapture);
      window.ArChessLog?.("INPUT_CONTROLLER_READY", { pointerEvents:true });
    } catch (error) { window.ArChessObservability?.error?.("INPUT_CONTROLLER_INIT_ERROR", error); throw error; }
  }

  onPointerDown(event) {
    try {
      if (event.button !== 0 || this.activePointerId !== null) return;
      const point = this.board.toWorld(event.clientX, event.clientY);
      if (!this.board.isInside(point)) return;
      event.preventDefault();
      if (this.handlers.pointerDown(point, event)) {
        this.activePointerId = event.pointerId;
        try { this.canvas.setPointerCapture?.(event.pointerId); } catch (error) { window.ArChessObservability?.warn?.("POINTER_CAPTURE_FAILED", { error:String(error) }); }
      }
    } catch (error) { window.ArChessObservability?.error?.("POINTER_DOWN_ERROR", error); this.cancel(); }
  }

  onPointerMove(event) {
    try {
      if (this.activePointerId !== event.pointerId) return;
      event.preventDefault();
      const point = this.board.toWorld(event.clientX, event.clientY);
      if (this.board.isInside(point)) this.handlers.pointerMove(point, event);
    } catch (error) { window.ArChessObservability?.error?.("POINTER_MOVE_ERROR", error); this.cancel(); }
  }

  onPointerUp(event) {
    try {
      if (this.activePointerId !== event.pointerId) return;
      event.preventDefault();
      this.handlers.pointerUp(this.board.toWorld(event.clientX, event.clientY), event);
    } catch (error) { window.ArChessObservability?.error?.("POINTER_UP_ERROR", error); }
    finally { this.releasePointer(event.pointerId); }
  }

  onPointerCancel(event) {
    try {
      if (this.activePointerId !== event.pointerId) return;
      event.preventDefault(); this.handlers.pointerCancel(event);
    } catch (error) { window.ArChessObservability?.error?.("POINTER_CANCEL_ERROR", error); }
    finally { this.releasePointer(event.pointerId); }
  }

  onLostPointerCapture(event) {
    try {
      if (this.activePointerId !== event.pointerId) return;
      this.handlers.pointerCancel?.(event);
    } catch (error) { window.ArChessObservability?.error?.("LOST_CAPTURE_ERROR", error); }
    finally { this.activePointerId = null; }
  }

  releasePointer(pointerId) {
    try { if (this.canvas.hasPointerCapture?.(pointerId)) this.canvas.releasePointerCapture(pointerId); }
    catch (error) { window.ArChessObservability?.warn?.("POINTER_RELEASE_FAILED", { error:String(error) }); }
    finally { this.activePointerId = null; }
  }

  cancel() {
    try { if (this.activePointerId !== null) this.releasePointer(this.activePointerId); this.handlers.pointerCancel?.(); }
    catch (error) { window.ArChessObservability?.error?.("INPUT_CANCEL_ERROR", error); this.activePointerId = null; }
  }
};
