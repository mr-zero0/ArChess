(() => {
  "use strict";
  if (window.__ArChessPresentationFix) return;
  window.__ArChessPresentationFix = true;

  const style = document.createElement("style");
  style.textContent = `
    #boardWrap { position:relative; isolation:isolate; }
    #boardWrap #glCanvas,#boardWrap #gameCanvas { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; display:block!important; }
    #boardWrap #glCanvas { z-index:2!important; pointer-events:none!important; opacity:1!important; }
    #boardWrap #gameCanvas { z-index:3!important; pointer-events:auto!important; opacity:1!important; background:transparent!important; }
    body.archess-3d-ready #boardWrap #gameCanvas { opacity:0!important; }
    .archess-camera-dock { position:absolute; top:12px; right:12px; z-index:20; display:flex; gap:4px; padding:6px; border:1px solid rgba(130,194,221,.22); border-radius:12px; background:rgba(6,12,18,.72); backdrop-filter:blur(16px); pointer-events:auto; user-select:none; }
    .archess-camera-dock button { height:28px; padding:0 9px; border:1px solid rgba(102,145,170,.18); border-radius:8px; color:#7891a3; background:rgba(14,24,34,.74); font-size:8px; font-weight:950; cursor:pointer; }
    .archess-camera-dock button.active { color:#ecfcff; border-color:rgba(77,230,255,.42); background:rgba(77,230,255,.14); }
    .archess-camera-dock button[data-camera="flip"] { width:30px; padding:0; font-size:13px; }
    .archess-3d-error { position:absolute; left:18px; right:18px; bottom:18px; z-index:22; padding:12px 14px; border:1px solid rgba(255,103,125,.22); border-radius:12px; color:#ffd5dc; background:rgba(45,11,18,.84); font:700 11px/1.4 Inter,system-ui,sans-serif; }
  `;
  document.head.appendChild(style);

  function hideLegacyFloatingPanels() {
    ["#archessProgressionButton","#archessProgressionPanel","#archessRankedButton","#archessRankedPanel"].forEach((selector) => document.querySelectorAll(selector).forEach((node) => { node.hidden=true; node.style.display="none"; }));
  }

  function markReady(scene) {
    window.__ArChessThreeD = scene;
    document.body.classList.add("archess-3d-ready");
    document.getElementById("archess3dError")?.remove();
    const gl = document.getElementById("glCanvas");
    const gameCanvas = document.getElementById("gameCanvas");
    if (gl) { gl.style.display="block"; gl.style.opacity="1"; }
    if (gameCanvas) gameCanvas.style.opacity="0";
    const dock = document.getElementById("archessCameraDock");
    if (dock) dock.dataset.ready="true";
    hideLegacyFloatingPanels();
  }

  function installSceneBridge(Scene) {
    if (!Scene?.prototype) return false;
    window.ThreeDScene = Scene;
    if (Scene.prototype.__archessPresentationBridge) return true;
    const originalRender = Scene.prototype.render;
    Scene.prototype.__archessPresentationBridge = true;
    Scene.prototype.render = function(game, deltaTime) {
      markReady(this);
      return originalRender.call(this, game, deltaTime);
    };
    return true;
  }

  async function loadSceneBridge() {
    try {
      const module = await import("./render3d.js");
      installSceneBridge(module.ThreeDScene);
    } catch (error) {
      console.error("ArChess 3D renderer failed to load:", error);
      const wrap=document.getElementById("boardWrap");
      if (wrap && !document.getElementById("archess3dError")) {
        const el=document.createElement("div");
        el.id="archess3dError";
        el.className="archess-3d-error";
        el.textContent="3D renderer failed to initialize. The 2D gameplay layer remains available; check the browser console for the renderer error.";
        wrap.appendChild(el);
      }
    }
  }

  function addControls() {
    const wrap=document.getElementById("boardWrap");
    if (!wrap || document.getElementById("archessCameraDock")) return;
    const dock=document.createElement("div");
    dock.id="archessCameraDock";
    dock.className="archess-camera-dock";
    dock.dataset.ready="false";
    dock.innerHTML='<button type="button" data-camera="broadcast" class="active">BROADCAST</button><button type="button" data-camera="top">TOP</button><button type="button" data-camera="cinematic">CINEMATIC</button><button type="button" data-camera="flip" aria-label="Flip camera">↻</button>';
    wrap.appendChild(dock);
    dock.addEventListener("pointerdown", e=>e.stopPropagation());
    dock.addEventListener("pointermove", e=>e.stopPropagation());
    dock.addEventListener("click", e=>{
      const button=e.target.closest("button[data-camera]");
      const scene=window.__ArChessThreeD;
      if(!button || !scene) return;
      const mode=button.dataset.camera;
      if(mode==="flip") scene.flip?.(); else scene.setPreset?.(mode);
      if(mode!=="flip") dock.querySelectorAll("button[data-camera]").forEach(item=>item.classList.toggle("active",item===button));
    });
  }

  function boot() {
    addControls();
    hideLegacyFloatingPanels();
    loadSceneBridge();
    setTimeout(() => import("./release_boot.js?v=release1").catch(error => console.error("ArChess release bootstrap failed", error)), 120);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
