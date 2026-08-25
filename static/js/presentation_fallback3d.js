(() => {
  "use strict";
  if (window.__ArChessCompat3D) return;
  window.__ArChessCompat3D = true;

  function injectMessage() {
    const wrap = document.getElementById("boardWrap");
    if (!wrap || document.getElementById("archessWebGLNotice")) return;
    const notice = document.createElement("div");
    notice.id = "archessWebGLNotice";
    notice.innerHTML = `<div><strong>3D graphics unavailable</strong><span>Enable hardware acceleration / WebGL2 in the browser to use the real ArChess 3D renderer.</span></div>`;
    Object.assign(notice.style,{position:"absolute",inset:"0",zIndex:"25",display:"grid",placeItems:"center",padding:"24px",pointerEvents:"none",background:"radial-gradient(circle,rgba(5,9,15,.2),rgba(3,5,8,.7))",color:"#eef8ff",font:"700 12px/1.5 Inter,system-ui,sans-serif",textAlign:"center"});
    notice.firstElementChild.style.cssText="max-width:360px;padding:18px 20px;border:1px solid rgba(116,233,255,.18);border-radius:16px;background:rgba(7,11,17,.84);backdrop-filter:blur(12px);box-shadow:0 20px 60px rgba(0,0,0,.4)";
    notice.querySelector("span").style.cssText="display:block;margin-top:6px;color:#8e9aaa;font-size:11px;font-weight:600";
    wrap.appendChild(notice);
  }

  function boot() {
    // This file is loaded before the main module. Delay the core patch until main.js
    // has created gameState, then patch the actual runtime rather than a duplicate game.
    setTimeout(() => import("/static/js/core_gameplay_fix.js?v=20260825-1").catch((error)=>console.error("ArChess core gameplay fix failed",error)), 150);
    setTimeout(() => import("/static/js/gameplay_polish.js?v=20260825-2").catch((error)=>console.error("ArChess gameplay polish failed",error)), 200);
    if (typeof window.WebGL2RenderingContext === "undefined") injectMessage();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
