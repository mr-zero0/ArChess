(() => {
  "use strict";
  if (window.__ArChessCompat3D) return;
  window.__ArChessCompat3D = true;

  const PIECES = {
    pawn: "♟", knight: "♞", bishop: "♝", rook: "♜", queen: "♛", king: "♚",
  };

  function injectStyles() {
    if (document.getElementById("archessCompat3DStyles")) return;
    const style = document.createElement("style");
    style.id = "archessCompat3DStyles";
    style.textContent = `
      #archessCompat3D{position:absolute;inset:0;z-index:2;display:none;overflow:hidden;pointer-events:none;perspective:1050px;background:radial-gradient(circle at 50% 58%,rgba(91,47,30,.6),rgba(20,10,7,.92) 72%)}
      #archessCompat3D.ready{display:block}
      .c3d-stage{position:absolute;left:50%;top:50%;width:min(82%,720px);aspect-ratio:1;transform:translate(-50%,-48%) rotateX(52deg) rotateZ(0deg);transform-style:preserve-3d;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
      .c3d-frame{position:absolute;inset:-4.5%;border-radius:7%;background:linear-gradient(145deg,#5b3b27,#24150e 52%,#70472e);box-shadow:0 35px 70px rgba(0,0,0,.55),inset 0 0 0 2px rgba(255,219,176,.08);transform:translateZ(-20px);transform-style:preserve-3d}
      .c3d-board{position:absolute;inset:2%;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);border-radius:3%;overflow:hidden;box-shadow:inset 0 0 0 2px rgba(255,255,255,.08),0 12px 28px rgba(0,0,0,.34);transform:translateZ(0);transform-style:preserve-3d}
      .c3d-square{position:relative}.c3d-square.light{background:linear-gradient(145deg,#d6b58b,#b58d61)}.c3d-square.dark{background:linear-gradient(145deg,#7a5137,#4e3020)}
      .c3d-piece{position:absolute;left:6.25%;top:6.25%;width:87.5%;height:87.5%;display:grid;place-items:center;color:#fff;font:900 clamp(24px,4.5vw,54px)/1 Georgia,serif;transform-style:preserve-3d;transition:left .16s ease,top .16s ease,transform .12s linear,filter .18s ease;will-change:transform,left,top}
      .c3d-piece.white{background:linear-gradient(145deg,#fff8ec 0%,#d9c5a7 45%,#8f6c4c 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 3px 2px rgba(255,255,255,.28),0 11px 10px rgba(0,0,0,.72),0 0 20px rgba(255,235,205,.12)}
      .c3d-piece.black{background:linear-gradient(145deg,#3e464c 0%,#0d1013 50%,#060708 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 3px 2px rgba(255,255,255,.05),0 11px 10px rgba(0,0,0,.85),0 0 18px rgba(0,0,0,.4)}
      .c3d-piece.moving{filter:drop-shadow(0 0 12px rgba(91,228,255,.45))}
      .c3d-piece.selected{filter:drop-shadow(0 0 14px rgba(104,231,255,.72))}
      .c3d-shadow{position:absolute;left:18%;top:20%;width:64%;height:55%;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.45),transparent 70%);transform:translateZ(-6px);pointer-events:none}
      .c3d-error{position:absolute;left:16px;bottom:16px;right:16px;padding:10px 12px;border:1px solid rgba(255,103,125,.22);border-radius:11px;background:rgba(37,9,14,.76);color:#ffd5dc;font:700 10px/1.35 Inter,system-ui,sans-serif;z-index:4}
    `;
    document.head.appendChild(style);
  }

  function setup() {
    const wrap = document.getElementById("boardWrap");
    if (!wrap || document.getElementById("archessCompat3D")) return;
    injectStyles();

    const root = document.createElement("div");
    root.id = "archessCompat3D";
    root.innerHTML = `<div class="c3d-stage"><div class="c3d-frame"></div><div class="c3d-board" id="c3dBoard"></div></div>`;
    wrap.appendChild(root);

    const board = root.querySelector("#c3dBoard");
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const sq = document.createElement("div");
        sq.className = `c3d-square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
        sq.dataset.row = String(row); sq.dataset.col = String(col);
        board.appendChild(sq);
      }
    }

    window.__ArChessCompat3D = { root, board };
  }

  function update() {
    const compat = window.__ArChessCompat3D;
    const game = window.gameState;
    if (!compat?.board || !game?.pieces) return;

    const byId = new Map([...compat.board.querySelectorAll(".c3d-piece")].map((el) => [el.dataset.id, el]));
    for (const piece of game.pieces) {
      if (!piece.alive) {
        const dead = byId.get(piece.id); if (dead) dead.remove();
        continue;
      }
      let el = byId.get(piece.id);
      if (!el) {
        el = document.createElement("div");
        el.className = `c3d-piece ${piece.team}`;
        el.dataset.id = piece.id;
        el.textContent = PIECES[piece.type] || "♟";
        const shadow = document.createElement("span");
        shadow.className = "c3d-shadow";
        el.appendChild(shadow);
        compat.board.appendChild(el);
      }

      const x = Math.max(0, Math.min(7, piece.x));
      const y = Math.max(0, Math.min(7, piece.y));
      const col = x * 12.5;
      const row = y * 12.5;
      const speed = Math.hypot(piece.vx || 0, piece.vy || 0);
      const moving = speed > 0.22;
      const selected = game.selectedPiece?.id === piece.id && game.phase === "aim";
      const lift = Math.min(30, speed * 3.5) + (moving ? Math.sin((game.simTime || 0) * 12 + piece.id.length) * 2 : 0);
      const skewX = moving ? (piece.vy || 0) * 1.8 : 0;
      const skewY = moving ? -(piece.vx || 0) * 1.8 : 0;
      el.style.left = `${col + 1.75}%`;
      el.style.top = `${row + 1.75}%`;
      el.style.transform = `translate3d(${skewX}px,${skewY}px,${lift}px) rotateX(${moving ? -8 : 0}deg) rotateZ(${moving ? skewX * .25 : 0}deg)`;
      el.classList.toggle("moving", moving);
      el.classList.toggle("selected", selected);
    }

    const turn = document.querySelector("#turnBadge");
    if (turn) turn.dataset.compat3d = "true";
  }

  function activate() {
    const compat = window.__ArChessCompat3D;
    if (!compat) return;
    document.body.classList.add("archess-compat-3d");
    compat.root.classList.add("ready");
    const game = document.getElementById("gameCanvas");
    if (game) game.style.opacity = "0";
    const gl = document.getElementById("glCanvas");
    if (gl) gl.style.display = "none";
    const dock = document.getElementById("archessCameraDock");
    if (dock) { dock.dataset.ready = "true"; dock.querySelector(".camera-status span").textContent = "3D COMPAT"; }
    const stage = compat.root.querySelector(".c3d-stage");
    document.querySelectorAll("#archessCameraDock button[data-camera]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!stage) return;
        const mode = button.dataset.camera;
        const transforms = {
          broadcast: "translate(-50%,-48%) rotateX(52deg) rotateZ(0deg)",
          top: "translate(-50%,-50%) rotateX(0deg) rotateZ(0deg)",
          cinematic: "translate(-50%,-46%) rotateX(60deg) rotateZ(-8deg)",
        };
        if (mode !== "flip" && transforms[mode]) stage.style.transform = transforms[mode];
        if (mode === "flip") stage.style.transform = stage.style.transform.includes("180deg") ? stage.style.transform.replace(" rotateY(180deg)", "") : `${stage.style.transform} rotateY(180deg)`;
      });
    });
  }

  function maybeActivateFallback() {
    setup();
    const start = performance.now();
    const timer = setInterval(() => {
      const gameReady = Boolean(window.gameState?.pieces?.length);
      const threeReady = Boolean(window.__ArChessThreeD);
      if (threeReady) { clearInterval(timer); return; }
      if (gameReady || performance.now() - start > 6500) { clearInterval(timer); activate(); update(); }
    }, 50);
    requestAnimationFrame(function frame() { update(); requestAnimationFrame(frame); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", maybeActivateFallback, { once:true });
  else maybeActivateFallback();
})();
