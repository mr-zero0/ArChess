(() => {
  "use strict";
  if (window.__ArChessPresentationFix) return;
  window.__ArChessPresentationFix = true;

  function injectStyle() {
    if (document.getElementById("archess-presentation-fix-style")) return;
    const style = document.createElement("style");
    style.id = "archess-presentation-fix-style";
    style.textContent = `
      body.archess-presentation-clean .topbar,body.archess-presentation-clean .left-panel,body.archess-presentation-clean .right-panel{display:none!important}
      body.archess-presentation-clean .game-layout{grid-template-columns:minmax(0,1fr)!important}
      body.archess-presentation-clean .board-zone{width:min(1100px,100%)!important;margin:72px auto 0!important}
      body.archess-presentation-clean .board-wrap{box-shadow:0 0 0 1px rgba(255,255,255,.08),0 32px 100px rgba(0,0,0,.55),0 0 100px rgba(104,231,255,.08)!important}
      body.archess-presentation-clean.archess-3d-active #gameCanvas{opacity:0!important}
      .presentation-controls{position:fixed;left:50%;top:88px;transform:translateX(-50%);z-index:61;display:flex;align-items:center;gap:5px;padding:5px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(9,11,17,.72);backdrop-filter:blur(18px);box-shadow:0 16px 50px rgba(0,0,0,.28)}
      .presentation-controls .presentation-label{color:#697183;font-size:8px;font-weight:900;letter-spacing:.16em;padding:0 6px}
      .presentation-controls button{border:0;border-radius:9px;background:transparent;color:#7e8798;padding:7px 9px;font-size:8px;font-weight:900;letter-spacing:.08em;cursor:pointer;transition:all .2s ease}
      .presentation-controls button:hover,.presentation-controls button.active{color:#fff;background:linear-gradient(135deg,rgba(104,231,255,.18),rgba(140,120,255,.18));box-shadow:inset 0 0 0 1px rgba(126,161,255,.15)}
      @media(max-width:700px){.presentation-controls{top:76px;max-width:calc(100vw - 20px);overflow:auto}.presentation-controls .presentation-label{display:none}.presentation-controls button{padding:7px 8px}body.archess-presentation-clean .board-zone{margin-top:58px!important}}
      @media(prefers-reduced-motion:reduce){.presentation-controls button{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function addControls() {
    if (document.getElementById("presentationControls")) return;
    const el = document.createElement("div");
    el.id = "presentationControls";
    el.className = "presentation-controls";
    el.innerHTML = `<span class="presentation-label">CAMERA</span><button type="button" data-camera="broadcast" class="active">BROADCAST</button><button type="button" data-camera="top">TOP</button><button type="button" data-camera="cinematic">CINEMATIC</button><button type="button" data-camera="flip" aria-label="Flip camera">↻</button>`;
    document.body.appendChild(el);
    el.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-camera]");
      if (!button || !window.__ArChessThreeD) return;
      const mode = button.dataset.camera;
      if (mode === "flip") window.__ArChessThreeD.flip();
      else window.__ArChessThreeD.setPreset(mode);
      if (mode !== "flip") el.querySelectorAll("button[data-camera]").forEach((item) => item.classList.toggle("active", item === button));
    });
  }

  function boot() {
    injectStyle();
    document.body.classList.add("archess-presentation-clean");
    addControls();
    const gl = document.getElementById("glCanvas");
    if (gl && gl.getContext("webgl2")) document.body.classList.add("archess-3d-active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
