(() => {
  "use strict";
  if (window.__ArChessPresentationFix) return;
  window.__ArChessPresentationFix = true;

  const style = document.createElement("style");
  style.id = "archess-presentation-fix-style";
  style.textContent = `
    #boardWrap { position: relative; isolation: isolate; }
    #boardWrap #glCanvas,
    #boardWrap #gameCanvas {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: block !important;
    }
    #boardWrap #glCanvas {
      z-index: 2 !important;
      pointer-events: none !important;
      opacity: 1 !important;
    }
    #boardWrap #gameCanvas {
      z-index: 3 !important;
      pointer-events: auto !important;
      opacity: 1 !important;
      background: transparent !important;
    }
    body.archess-3d-ready #boardWrap #gameCanvas { opacity: 0 !important; }

    .archess-camera-dock {
      position:absolute;
      top:12px;
      right:12px;
      z-index:20;
      display:flex;
      align-items:center;
      gap:4px;
      padding:6px;
      border:1px solid rgba(130,194,221,.22);
      border-radius:12px;
      background:rgba(6,12,18,.72);
      box-shadow:0 14px 34px rgba(0,0,0,.30),inset 0 1px rgba(255,255,255,.04);
      backdrop-filter:blur(16px) saturate(135%);
      pointer-events:auto;
      user-select:none;
    }
    .archess-camera-dock .camera-status {
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding:0 7px 0 6px;
      color:#91a8ba;
      font-size:8px;
      font-weight:950;
      letter-spacing:.12em;
    }
    .archess-camera-dock .camera-status i {
      width:6px;
      height:6px;
      border-radius:999px;
      background:#ff677d;
      box-shadow:0 0 8px rgba(255,103,125,.32);
    }
    .archess-camera-dock[data-ready="true"] .camera-status i {
      background:#71f0a2;
      box-shadow:0 0 10px rgba(113,240,162,.55);
    }
    .archess-camera-dock button {
      height:28px;
      padding:0 9px;
      border:1px solid rgba(102,145,170,.18);
      border-radius:8px;
      color:#7891a3;
      background:rgba(14,24,34,.74);
      font-size:8px;
      font-weight:950;
      letter-spacing:.08em;
      cursor:pointer;
      transition:.18s ease;
    }
    .archess-camera-dock button:hover { border-color:rgba(77,230,255,.42); color:#d8f7ff; background:rgba(24,46,60,.86); transform:translateY(-1px); }
    .archess-camera-dock button.active { color:#ecfcff; border-color:rgba(77,230,255,.42); background:linear-gradient(135deg,rgba(77,230,255,.14),rgba(124,105,255,.12)); box-shadow:inset 0 0 0 1px rgba(126,161,255,.08),0 0 18px rgba(77,230,255,.05); }
    .archess-camera-dock button[data-camera="flip"] { width:30px; padding:0; font-size:13px; letter-spacing:0; }
    .archess-3d-error {
      position:absolute;
      inset:auto 18px 18px 18px;
      z-index:22;
      max-width:460px;
      padding:12px 14px;
      border:1px solid rgba(255,103,125,.22);
      border-radius:12px;
      color:#ffd5dc;
      background:rgba(45,11,18,.84);
      backdrop-filter:blur(14px);
      box-shadow:0 12px 40px rgba(0,0,0,.25);
      font:700 11px/1.4 Inter,system-ui,sans-serif;
    }
    body.archess-final-ui #archessProgressionButton,
    body.archess-final-ui #archessProgressionPanel,
    body.archess-final-ui #archessRankedButton,
    body.archess-final-ui #archessRankedPanel { display:none !important; }
    @media (max-width:760px) {
      .archess-camera-dock { top:8px; right:8px; gap:3px; padding:5px; }
      .archess-camera-dock .camera-status { display:none; }
      .archess-camera-dock button { height:30px; padding:0 8px; }
    }
  `;
  document.head.appendChild(style);

  function hideLegacyFloatingPanels() {
    const known = ["#archessProgressionButton", "#archessProgressionPanel", "#archessRankedButton", "#archessRankedPanel"];
    known.forEach((selector) => document.querySelectorAll(selector).forEach((node) => {
      node.hidden = true;
      node.style.display = "none";
    }));

    document.querySelectorAll(".app-shell *").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const text = (node.innerText || "").trim().replace(/\s+/g, " ");
      if (text.length < 240 && /^ONLINE MATCH\b/i.test(text) && /ROOM CODE/i.test(text)) {
        node.style.display = "none";
        node.setAttribute("aria-hidden", "true");
      }
    });
  }

  function markReady(scene) {
    window.__ArChessThreeD = scene;
    document.body.classList.add("archess-3d-ready");
    document.getElementById("archess3dError")?.remove();
    const gl = document.getElementById("glCanvas");
    const gameCanvas = document.getElementById("gameCanvas");
    if (gl) { gl.style.display = "block"; gl.style.opacity = "1"; }
    if (gameCanvas) gameCanvas.style.opacity = "0";
    const dock = document.getElementById("archessCameraDock");
    if (dock) dock.dataset.ready = "true";
    hideLegacyFloatingPanels();
  }

  function installSceneBridge() {
    const Scene = window.ThreeDScene;
    if (!Scene?.prototype) return false;
    if (Scene.prototype.__archessPresentationBridge) return true;

    const originalRender = Scene.prototype.render;
    Scene.prototype.__archessPresentationBridge = true;
    Scene.prototype.render = function presentationRender(game, deltaTime) {
      markReady(this);
      return originalRender.call(this, game, deltaTime);
    };
    return true;
  }

  function addControls() {
    const wrap = document.getElementById("boardWrap");
    if (!wrap || document.getElementById("archessCameraDock")) return;
    const dock = document.createElement("div");
    dock.id = "archessCameraDock";
    dock.className = "archess-camera-dock";
    dock.dataset.ready = "false";
    dock.innerHTML = `
      <span class="camera-status"><i></i><span>3D CAMERA</span></span>
      <button type="button" data-camera="broadcast" class="active">BROADCAST</button>
      <button type="button" data-camera="top">TOP</button>
      <button type="button" data-camera="cinematic">CINEMATIC</button>
      <button type="button" data-camera="flip" aria-label="Flip camera">↻</button>`;
    wrap.appendChild(dock);
    dock.addEventListener("pointerdown", (event) => event.stopPropagation());
    dock.addEventListener("pointermove", (event) => event.stopPropagation());
    dock.addEventListener("wheel", (event) => event.stopPropagation(), { passive:true });
    dock.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-camera]");
      if (!button) return;
      const scene = window.__ArChessThreeD;
      if (!scene) return;
      const mode = button.dataset.camera;
      if (mode === "flip") scene.flip?.();
      else scene.setPreset?.(mode);
      if (mode !== "flip") dock.querySelectorAll("button[data-camera]").forEach((item) => item.classList.toggle("active", item === button));
    });
  }

  function showError(message) {
    const wrap = document.getElementById("boardWrap");
    if (!wrap || document.getElementById("archess3dError")) return;
    const error = document.createElement("div");
    error.id = "archess3dError";
    error.className = "archess-3d-error";
    error.textContent = message;
    wrap.appendChild(error);
  }

  function waitForSceneBridge() {
    const started = performance.now();
    const timer = setInterval(() => {
      if (installSceneBridge()) {
        clearInterval(timer);
        if (window.__ArChessThreeD) markReady(window.__ArChessThreeD);
        return;
      }
      if (performance.now() - started > 5000) {
        clearInterval(timer);
        showError("3D renderer did not initialize. WebGL2 may be disabled in this browser; see the browser console for the exact error.");
      }
    }, 10);
  }

  function boot() {
    addControls();
    hideLegacyFloatingPanels();
    waitForSceneBridge();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
