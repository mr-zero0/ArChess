(() => {
  "use strict";
  if (window.__ArChessPresentationFix) return;
  window.__ArChessPresentationFix = true;

  const style = document.createElement("style");
  style.id = "archess-presentation-fix-style";
  style.textContent = `
    body.archess-presentation-clean .topbar,
    body.archess-presentation-clean .left-panel,
    body.archess-presentation-clean .right-panel { display:none!important; }
    body.archess-presentation-clean .game-layout { grid-template-columns:minmax(0,1fr)!important; }
    body.archess-presentation-clean .board-zone { width:min(1100px,100%)!important; margin:72px auto 0!important; }
    body.archess-presentation-clean .board-frame { box-shadow:0 0 0 1px rgba(255,255,255,.08),0 32px 100px rgba(0,0,0,.55),0 0 100px rgba(104,231,255,.08)!important; }
    #presentation3dCanvas { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; z-index:2!important; display:block!important; pointer-events:none!important; }
    body.archess-presentation-clean #gameCanvas { z-index:3!important; opacity:0!important; background:transparent!important; }
    .presentation-controls { position:fixed; left:50%; top:88px; transform:translateX(-50%); z-index:100; display:flex; align-items:center; gap:5px; padding:5px; border:1px solid rgba(255,255,255,.10); border-radius:14px; background:rgba(9,11,17,.78); backdrop-filter:blur(18px); box-shadow:0 16px 50px rgba(0,0,0,.32); }
    .presentation-controls .presentation-label { color:#697183; font-size:8px; font-weight:900; letter-spacing:.16em; padding:0 6px; }
    .presentation-controls button { border:0; border-radius:9px; background:transparent; color:#7e8798; padding:7px 9px; font-size:8px; font-weight:900; letter-spacing:.08em; cursor:pointer; transition:.2s ease; }
    .presentation-controls button:hover,.presentation-controls button.active { color:#fff; background:linear-gradient(135deg,rgba(104,231,255,.18),rgba(140,120,255,.18)); box-shadow:inset 0 0 0 1px rgba(126,161,255,.16); }
    @media(max-width:700px){ .presentation-controls{top:76px;max-width:calc(100vw - 20px);overflow:auto}.presentation-controls .presentation-label{display:none}body.archess-presentation-clean .board-zone{margin-top:58px!important} }
  `;
  document.head.appendChild(style);
  document.body.classList.add("archess-presentation-clean");

  const controls = document.createElement("div");
  controls.id = "presentationControls";
  controls.className = "presentation-controls";
  controls.innerHTML = `<span class="presentation-label">CAMERA</span><button type="button" data-camera="broadcast" class="active">BROADCAST</button><button type="button" data-camera="top">TOP</button><button type="button" data-camera="cinematic">CINEMATIC</button><button type="button" data-camera="flip">↻</button>`;
  document.body.appendChild(controls);
  controls.addEventListener("click", event => {
    const button = event.target.closest("button[data-camera]");
    if (!button || !window.__ArChessThreeD) return;
    const mode = button.dataset.camera;
    if (mode === "flip") window.__ArChessThreeD.flip();
    else { window.__ArChessThreeD.setPreset(mode); controls.querySelectorAll("button[data-camera]").forEach(b => b.classList.toggle("active", b === button)); }
  });

  const module = document.createElement("script");
  module.type = "module";
  module.src = "/static/js/presentation3d.js?v=3";
  document.head.appendChild(module);
})();
