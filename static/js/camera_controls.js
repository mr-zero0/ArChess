(() => {
  "use strict";

  const presets = {
    broadcast: { position: [5.2, 7.8, 9.6], target: [0, 0, 0] },
    top: { position: [0, 11.8, 0.01], target: [0, 0, 0] },
    cinematic: { position: [7.8, 5.3, 7.8], target: [0, 0.25, 0] },
  };

  function install() {
    const Scene = window.ThreeDScene;
    if (!Scene || !Scene.prototype || window.__ArChessCameraPatched) return false;
    window.__ArChessCameraPatched = true;

    const proto = Scene.prototype;
    const originalRender = proto.render;

    proto.installCameraControls = function () {
      if (this.__cameraControlsInstalled) return;
      this.__cameraControlsInstalled = true;
      this.__cameraTarget = { x: 0, y: 0, z: 0 };
      this.__cameraGoal = { x: 5.2, y: 7.8, z: 9.6 };
      this.__cameraTargetGoal = { x: 0, y: 0, z: 0 };
      this.__cameraDragging = false;
      this.__cameraLast = null;
      this.__cameraYaw = Math.atan2(this.camera.position.x, this.camera.position.z);
      this.__cameraPitch = Math.atan2(this.camera.position.y, Math.hypot(this.camera.position.x, this.camera.position.z));
      this.__cameraRadius = Math.hypot(this.camera.position.x, this.camera.position.z);

      const target = this.canvas.parentElement || this.canvas;
      target.addEventListener("pointerdown", (event) => {
        if (event.button !== 2) return;
        this.__cameraDragging = true;
        this.__cameraLast = { x: event.clientX, y: event.clientY };
        target.setPointerCapture?.(event.pointerId);
      });
      target.addEventListener("pointermove", (event) => {
        if (!this.__cameraDragging || !this.__cameraLast) return;
        const dx = event.clientX - this.__cameraLast.x;
        const dy = event.clientY - this.__cameraLast.y;
        this.__cameraLast = { x: event.clientX, y: event.clientY };
        this.__cameraYaw -= dx * 0.008;
        this.__cameraPitch = Math.max(0.38, Math.min(1.42, this.__cameraPitch + dy * 0.006));
        this.__applyOrbitGoal();
      });
      const release = () => { this.__cameraDragging = false; this.__cameraLast = null; };
      target.addEventListener("pointerup", release);
      target.addEventListener("pointercancel", release);
      target.addEventListener("pointerleave", release);
      target.addEventListener("wheel", (event) => {
        if (event.target.closest(".archess-camera-dock")) return;
        event.preventDefault();
        this.__cameraRadius = Math.max(7, Math.min(14.5, this.__cameraRadius + event.deltaY * 0.008));
        this.__applyOrbitGoal();
      }, { passive: false });
      target.addEventListener("contextmenu", (event) => event.preventDefault());
    };

    proto.__applyOrbitGoal = function () {
      const r = this.__cameraRadius;
      this.__cameraGoal = { x: Math.sin(this.__cameraYaw) * r, y: Math.sin(this.__cameraPitch) * r, z: Math.cos(this.__cameraYaw) * r };
      this.__cameraTargetGoal = { x: 0, y: 0, z: 0 };
    };

    proto.setPreset = function (name) {
      const preset = presets[name] || presets.broadcast;
      this.__cameraGoal = { x: preset.position[0], y: preset.position[1], z: preset.position[2] };
      this.__cameraTargetGoal = { x: preset.target[0], y: preset.target[1], z: preset.target[2] };
      this.__cameraYaw = Math.atan2(this.__cameraGoal.x, this.__cameraGoal.z);
      this.__cameraPitch = Math.atan2(this.__cameraGoal.y, Math.hypot(this.__cameraGoal.x, this.__cameraGoal.z));
      this.__cameraRadius = Math.max(0.01, Math.hypot(this.__cameraGoal.x, this.__cameraGoal.z));
    };

    proto.flip = function () { this.__cameraYaw += Math.PI; this.__applyOrbitGoal(); };

    proto.updateCamera = function (deltaTime) {
      const ease = 1 - Math.pow(0.0008, Math.max(0.001, deltaTime));
      this.camera.position.x += (this.__cameraGoal.x - this.camera.position.x) * ease;
      this.camera.position.y += (this.__cameraGoal.y - this.camera.position.y) * ease;
      this.camera.position.z += (this.__cameraGoal.z - this.camera.position.z) * ease;
      this.__cameraTarget.x += (this.__cameraTargetGoal.x - this.__cameraTarget.x) * ease;
      this.__cameraTarget.y += (this.__cameraTargetGoal.y - this.__cameraTarget.y) * ease;
      this.__cameraTarget.z += (this.__cameraTargetGoal.z - this.__cameraTarget.z) * ease;
      this.camera.lookAt(this.__cameraTarget.x, this.__cameraTarget.y, this.__cameraTarget.z);
    };

    proto.render = function (game, deltaTime) {
      if (!this.__cameraControlsInstalled) { this.installCameraControls(); this.setPreset("broadcast"); }
      window.__ArChessThreeD = this;
      if (document.body) document.body.classList.add("archess-3d-ready");
      this.updateCamera(deltaTime);
      return originalRender.call(this, game, deltaTime);
    };

    return true;
  }

  if (!install()) {
    const timer = setInterval(() => { if (install()) clearInterval(timer); }, 10);
  }
})();
