(() => {
  "use strict";
  if (window.__ArChessPresentationFix) return;
  window.__ArChessPresentationFix = true;

  const style = document.createElement("style");
  style.id = "archess-presentation-fix-style";
  style.textContent = `
    .archess-camera-dock {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px;
      border: 1px solid rgba(130, 194, 221, .22);
      border-radius: 12px;
      background: rgba(6, 12, 18, .72);
      box-shadow: 0 14px 34px rgba(0,0,0,.30), inset 0 1px rgba(255,255,255,.04);
      backdrop-filter: blur(16px) saturate(135%);
      pointer-events: auto;
      user-select: none;
    }
    .archess-camera-dock .camera-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 7px 0 6px;
      color: #91a8ba;
      font-size: 8px;
      font-weight: 950;
      letter-spacing: .12em;
    }
    .archess-camera-dock .camera-status i {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #475866;
      box-shadow: 0 0 0 transparent;
    }
    .archess-camera-dock[data-ready="true"] .camera-status i {
      background: #71f0a2;
      box-shadow: 0 0 10px rgba(113,240,162,.55);
    }
    .archess-camera-dock button {
      height: 28px;
      padding: 0 9px;
      border: 1px solid rgba(102, 145, 170, .18);
      border-radius: 8px;
      color: #7891a3;
      background: rgba(14, 24, 34, .74);
      font-size: 8px;
      font-weight: 950;
      letter-spacing: .08em;
      cursor: pointer;
      transition: .18s ease;
    }
    .archess-camera-dock button:hover {
      border-color: rgba(77,230,255,.42);
      color: #d8f7ff;
      background: rgba(24, 46, 60, .86);
      transform: translateY(-1px);
    }
    .archess-camera-dock button.active {
      color: #ecfcff;
      border-color: rgba(77,230,255,.42);
      background: linear-gradient(135deg, rgba(77,230,255,.14), rgba(124,105,255,.12));
      box-shadow: inset 0 0 0 1px rgba(126,161,255,.08), 0 0 18px rgba(77,230,255,.05);
    }
    .archess-camera-dock button[data-camera="flip"] {
      width: 30px;
      padding: 0;
      font-size: 13px;
      letter-spacing: 0;
    }
    @media (max-width: 760px) {
      .archess-camera-dock { top: 8px; right: 8px; gap: 3px; padding: 5px; }
      .archess-camera-dock .camera-status { display: none; }
      .archess-camera-dock button { height: 30px; padding: 0 8px; }
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
      if (mode !== "flip") {
        dock.querySelectorAll("button[data-camera]").forEach((item) => item.classList.toggle("active", item === button));
      }
    });

    const sync = () => {
      const ready = Boolean(window.__ArChessThreeD);
      dock.dataset.ready = ready ? "true" : "false";
      if (!ready) dock.setAttribute("aria-disabled", "true");
      else dock.removeAttribute("aria-disabled");
      if (!ready) dock.title = "3D renderer is still initializing";
      else dock.title = "3D camera controls";
    };
    sync();
    const timer = setInterval(() => {
      sync();
      if (window.__ArChessThreeD) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addControls, { once: true });
  } else {
    addControls();
  }
})();
