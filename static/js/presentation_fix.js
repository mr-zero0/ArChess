(() => {
  "use strict";
  if (window.__ArChessPresentationFix) return;
  window.__ArChessPresentationFix = true;

  const style = document.createElement("style");
  style.id = "archess-presentation-fix-style";
  style.textContent = `
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
      background:#475866;
      box-shadow:0 0 0 transparent;
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
    .archess-camera-dock button:hover {
      border-color:rgba(77,230,255,.42);
      color:#d8f7ff;
      background:rgba(24,46,60,.86);
      transform:translateY(-1px);
    }
    .archess-camera-dock button.active {
      color:#ecfcff;
      border-color:rgba(77,230,255,.42);
      background:linear-gradient(135deg,rgba(77,230,255,.14),rgba(124,105,255,.12));
      box-shadow:inset 0 0 0 1px rgba(126,161,255,.08),0 0 18px rgba(77,230,255,.05);
    }
    .archess-camera-dock button[data-camera="flip"] {
      width:30px;
      padding:0;
      font-size:13px;
      letter-spacing:0;
    }

    /* Presentation stack: WebGL is visual; the existing 2D canvas remains the input surface. */
    #boardWrap #glCanvas {
      z-index:2 !important;
      pointer-events:none !important;
      opacity:1 !important;
      display:block !important;
    }
    #boardWrap #gameCanvas {
      z-index:3 !important;
      pointer-events:auto !important;
    }
    body.archess-3d-ready #boardWrap #gameCanvas {
      opacity:0 !important;
      background:transparent !important;
    }

    /* Remove the obsolete floating product-generation controls. */
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
      <button type="button" data-camera="flip" aria-label="Flip camera">↻</button>
    `;
    wrap.appendChild(dock);

    dock.addEventListener("pointerdown", (event) => event.stopPropagation());
    dock.addEventListener("pointermove", (event) => event.stopPropagation());
    dock.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
    dock.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-camera]");
      if (!button) return;
      const scene = window.__ArChessThreeD;
      if (!scene) return;
      const mode = button.dataset.camera;
      if (mode === "flip") scene.flip();
      else scene.setPreset(mode);
      if (mode !== "flip") dock.querySelectorAll("button[data-camera]").forEach((item) => item.classList.toggle("active", item === button));
    });
  }

  function installOrbitBridge() {
    const wrap = document.getElementById("boardWrap");
    if (!wrap || wrap.dataset.orbitBridge === "1") return;
    wrap.dataset.orbitBridge = "1";

    let dragging = false;
    let pointer = null;
    let yaw = 0.58;
    let pitch = 0.68;
    let radius = 11.8;

    const apply = () => {
      const scene = window.__ArChessThreeD;
      if (!scene || !scene.camera) return;
      const horizontal = Math.cos(pitch) * radius;
      scene.camera.position.set(Math.sin(yaw) * horizontal, Math.sin(pitch) * radius, Math.cos(yaw) * horizontal);
      scene.camera.lookAt(0, 0, 0);
    };

    const syncFromScene = () => {
      const scene = window.__ArChessThreeD;
      if (!scene?.camera) return;
      const c = scene.camera.position;
      radius = Math.max(7, Math.min(16, Math.hypot(c.x, c.z)));
      yaw = Math.atan2(c.x, c.z);
      pitch = Math.max(.38, Math.min(1.42, Math.atan2(c.y, Math.hypot(c.x, c.z))));
    };

    wrap.addEventListener("contextmenu", (event) => event.preventDefault());
    wrap.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".archess-camera-dock")) return;
      if (event.button !== 2) return;
      syncFromScene();
      dragging = true;
      pointer = { x: event.clientX, y: event.clientY };
      wrap.setPointerCapture?.(event.pointerId);
    });
    wrap.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer = { x: event.clientX, y: event.clientY };
      yaw -= dx * .008;
      pitch = Math.max(.38, Math.min(1.42, pitch + dy * .006));
      apply();
    });
    const stop = () => { dragging = false; pointer = null; };
    wrap.addEventListener("pointerup", stop);
    wrap.addEventListener("pointercancel", stop);
    wrap.addEventListener("wheel", (event) => {
      if (event.target.closest(".archess-camera-dock")) return;
      event.preventDefault();
      syncFromScene();
      radius = Math.max(7, Math.min(16, radius + event.deltaY * .008));
      apply();
    }, { passive:false });

    const timer = setInterval(() => {
      const scene = window.__ArChessThreeD;
      if (!scene) return;
      if (!dragging) syncFromScene();
      clearInterval(timer);
    }, 120);
  }

  function hideLegacyFloatingPanels() {
    const known = [
      "#archessProgressionButton",
      "#archessProgressionPanel",
      "#archessRankedButton",
      "#archessRankedPanel",
    ];
    known.forEach((selector) => document.querySelectorAll(selector).forEach((node) => { node.hidden = true; node.style.display = "none"; }));

    // The legacy room panel is generated dynamically in some builds. Hide only
    // the exact player-facing panel, never the game board or product shell.
    document.querySelectorAll("body > *:not(.app-shell):not(.archess-ui):not(.noise)").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const text = (node.innerText || "").trim().replace(/\s+/g, " ");
      if (/^ONLINE MATCH\b/i.test(text) && /ROOM CODE/i.test(text)) {
        node.style.display = "none";
        node.setAttribute("aria-hidden", "true");
      }
    });
  }

  function waitFor3D() {
    const sync = () => {
      const ready = Boolean(window.__ArChessThreeD);
      const dock = document.getElementById("archessCameraDock");
      if (dock) {
        dock.dataset.ready = ready ? "true" : "false";
        dock.title = ready ? "3D camera controls" : "3D renderer is still initializing";
      }
      if (ready) {
        document.body.classList.add("archess-3d-ready");
        const gl = document.getElementById("glCanvas");
        const gameCanvas = document.getElementById("gameCanvas");
        if (gl) { gl.style.display = "block"; gl.style.opacity = "1"; gl.style.zIndex = "2"; }
        if (gameCanvas) { gameCanvas.style.opacity = "0"; gameCanvas.style.zIndex = "3"; }
        hideLegacyFloatingPanels();
        installOrbitBridge();
      }
    };
    sync();
    const timer = setInterval(() => {
      sync();
      if (window.__ArChessThreeD) clearInterval(timer);
    }, 100);
  }

  function boot() {
    addControls();
    hideLegacyFloatingPanels();
    waitFor3D();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
