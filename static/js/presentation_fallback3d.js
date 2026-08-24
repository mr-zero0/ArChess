(() => {
  "use strict";
  if (window.__ArChessCompat3D) return;
  window.__ArChessCompat3D = true;

  const GLYPHS = {
    pawn: { white: "♙", black: "♟" },
    knight: { white: "♘", black: "♞" },
    bishop: { white: "♗", black: "♝" },
    rook: { white: "♖", black: "♜" },
    queen: { white: "♕", black: "♛" },
    king: { white: "♔", black: "♚" },
  };

  function injectStyles() {
    if (document.getElementById("archessCompat3DStyles")) return;
    const style = document.createElement("style");
    style.id = "archessCompat3DStyles";
    style.textContent = `
      #archessCompat3D { position:absolute; inset:0; z-index:2; display:none; overflow:hidden; pointer-events:none; perspective:1050px; background:radial-gradient(circle at 50% 58%,rgba(91,47,30,.6),rgba(20,10,7,.92) 72%); }
      #archessCompat3D.ready { display:block; }
      .c3d-stage { position:absolute; left:50%; top:50%; width:min(82%,720px); aspect-ratio:1; transform:translate(-50%,-48%) rotateX(52deg); transform-style:preserve-3d; transition:transform .6s cubic-bezier(.2,.8,.2,1); }
      .c3d-frame { position:absolute; inset:-4.5%; border-radius:7%; background:linear-gradient(145deg,#5b3b27,#24150e 52%,#70472e); box-shadow:0 35px 70px rgba(0,0,0,.55),inset 0 0 0 2px rgba(255,219,176,.08); transform:translateZ(-20px); transform-style:preserve-3d; }
      .c3d-board { position:absolute; inset:2%; display:grid; grid-template-columns:repeat(8,1fr); grid-template-rows:repeat(8,1fr); border-radius:3%; overflow:hidden; box-shadow:inset 0 0 0 2px rgba(255,255,255,.08),0 12px 28px rgba(0,0,0,.34); transform-style:preserve-3d; }
      .c3d-square { position:relative; }
      .c3d-square.light { background:linear-gradient(145deg,#d6b58b,#b58d61); }
      .c3d-square.dark { background:linear-gradient(145deg,#7a5137,#4e3020); }
      .c3d-piece { position:absolute; left:0; top:0; width:12.5%; height:12.5%; display:grid; place-items:center; z-index:3; color:#f5ead8; font:900 clamp(30px,5vw,60px)/1 Georgia,serif; transform-style:preserve-3d; transition:left .12s ease,top .12s ease,transform .12s linear,filter .18s ease; text-shadow:0 2px 0 rgba(255,255,255,.22),0 5px 0 rgba(73,42,23,.72),0 9px 10px rgba(0,0,0,.72); will-change:transform,left,top; pointer-events:none; }
      .c3d-piece.black { color:#1b1f23; text-shadow:0 -1px 0 rgba(255,255,255,.09),0 4px 0 rgba(0,0,0,.72),0 9px 12px rgba(0,0,0,.86); }
      .c3d-piece.moving { filter:drop-shadow(0 0 12px rgba(91,228,255,.45)); }
      .c3d-piece.selected { filter:drop-shadow(0 0 14px rgba(104,231,255,.72)); }
      .c3d-shadow { position:absolute; left:18%; top:20%; width:64%; height:55%; border-radius:50%; background:radial-gradient(ellipse,rgba(0,0,0,.45),transparent 70%); transform:translateZ(-6px); pointer-events:none; z-index:-1; }
    `;
    document.head.appendChild(style);
  }

  function setup() {
    const wrap = document.getElementById("boardWrap");
    if (!wrap || document.getElementById("archessCompat3D")) return;
    injectStyles();
    const root = document.createElement("div");
    root.id = "archessCompat3D";
    root.innerHTML = '<div class="c3d-stage"><div class="c3d-frame"></div><div class="c3d-board" id="c3dBoard"></div></div>';
    wrap.appendChild(root);
    const board = root.querySelector("#c3dBoard");
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const square = document.createElement("div");
        square.className = `c3d-square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
        board.appendChild(square);
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
        byId.get(piece.id)?.remove();
        continue;
      }

      let el = byId.get(piece.id);
      if (!el) {
        el = document.createElement("div");
        el.className = `c3d-piece ${piece.team}`;
        el.dataset.id = piece.id;
        compat.board.appendChild(el);
      }

      el.textContent = GLYPHS[piece.type]?.[piece.team] || (piece.team === "white" ? "♙" : "♟");
      const x = Number.isFinite(piece.x) ? piece.x : 0.5;
      const y = Number.isFinite(piece.y) ? piece.y : 0.5;
      const speed = Math.hypot(piece.vx || 0, piece.vy || 0);
      const moving = speed > 0.22;
      const selected = game.selectedPiece?.id === piece.id && game.phase === "aim";
      const left = ((x - 0.5) / 8) * 100;
      const top = ((y - 0.5) / 8) * 100;
      const lift = Math.min(30, speed * 3.5) + (moving ? Math.sin((game.simTime || 0) * 12 + piece.id.length) * 2 : 0);
      const skewX = moving ? (piece.vy || 0) * 1.8 : 0;
      const skewY = moving ? -(piece.vx || 0) * 1.8 : 0;

      el.style.left = `${left}%`;
      el.style.top = `${top}%`;
      el.style.transform = `translate3d(${skewX}px,${skewY}px,${lift}px) rotateX(${moving ? -8 : 0}deg) rotateZ(${moving ? skewX * .25 : 0}deg)`;
      el.classList.toggle("moving", moving);
      el.classList.toggle("selected", selected);
    }
  }

  function activate() {
    const compat = window.__ArChessCompat3D;
    if (!compat) return;
    compat.root.classList.add("ready");
    document.getElementById("archess3dError")?.remove();
    const gameCanvas = document.getElementById("gameCanvas");
    if (gameCanvas) gameCanvas.style.setProperty("opacity", "0", "important");
    const glCanvas = document.getElementById("glCanvas");
    if (glCanvas) glCanvas.style.display = "none";
    const dock = document.getElementById("archessCameraDock");
    if (dock) {
      dock.dataset.ready = "true";
      const label = dock.querySelector(".camera-status span");
      if (label) label.textContent = "3D COMPAT";
    }

    const stage = compat.root.querySelector(".c3d-stage");
    if (!stage) return;
    document.querySelectorAll("#archessCameraDock button[data-camera]").forEach((button) => {
      if (button.dataset.compatBound === "1") return;
      button.dataset.compatBound = "1";
      button.addEventListener("click", () => {
        const mode = button.dataset.camera;
        const transforms = {
          broadcast: "translate(-50%,-48%) rotateX(52deg) rotateZ(0deg)",
          top: "translate(-50%,-50%) rotateX(0deg) rotateZ(0deg)",
          cinematic: "translate(-50%,-46%) rotateX(60deg) rotateZ(-8deg)",
        };
        if (mode !== "flip" && transforms[mode]) stage.style.transform = transforms[mode];
        if (mode === "flip") {
          stage.style.transform = stage.style.transform.includes(" rotateY(180deg)")
            ? stage.style.transform.replace(" rotateY(180deg)", "")
            : `${stage.style.transform} rotateY(180deg)`;
        }
      });
    });
    update();
  }

  function boot() {
    setup();
    const started = performance.now();
    const timer = setInterval(() => {
      if (window.__ArChessThreeD) {
        clearInterval(timer);
        return;
      }
      if (window.gameState?.pieces?.length) {
        clearInterval(timer);
        activate();
      } else if (performance.now() - started > 6500) {
        clearInterval(timer);
        activate();
      }
    }, 50);

    requestAnimationFrame(function frame() {
      update();
      if (!window.__ArChessThreeD && window.__ArChessCompat3D?.root.classList.contains("ready")) activate();
      requestAnimationFrame(frame);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
