(() => {
  "use strict";
  if (window.__ArChessAuthGate) return;
  window.__ArChessAuthGate = true;

  const install = () => {
    const wrap = document.getElementById("boardWrap");
    if (!wrap) return false;
    let gate = document.getElementById("archessAuthGate");
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "archessAuthGate";
      gate.innerHTML = `<div class="auth-gate-card"><div class="auth-gate-mark" aria-hidden="true">♜</div><div class="auth-gate-kicker">ACCOUNT REQUIRED</div><h2>Sign in to enter the arena</h2><p>Your matches, rating and battle history are tied to your ArChess account.</p><a href="/login" class="auth-gate-btn">SIGN IN / CREATE ACCOUNT</a></div>`;
      Object.assign(gate.style, { position:"absolute", inset:"0", zIndex:"30", display:"grid", placeItems:"center", padding:"24px", pointerEvents:"auto", background:"radial-gradient(circle at center, rgba(7,10,16,.25), rgba(3,5,9,.86))", backdropFilter:"blur(7px)" });
      wrap.appendChild(gate);
    }
    if (!document.getElementById("archessAuthGateStyle")) {
      const style=document.createElement("style"); style.id="archessAuthGateStyle"; style.textContent=`#archessAuthGate.hidden{display:none!important}#archessAuthGate .auth-gate-card{width:min(390px,calc(100% - 30px));padding:30px;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:rgba(9,12,18,.90);box-shadow:0 30px 90px rgba(0,0,0,.55);text-align:center;color:#f4f7fb;font:600 12px/1.6 Inter,system-ui,sans-serif}#archessAuthGate .auth-gate-mark{width:54px;height:54px;margin:0 auto 16px;display:grid;place-items:center;border-radius:17px;background:linear-gradient(145deg,#7b67ff,#52dff7);font-size:26px;box-shadow:0 0 35px rgba(116,233,255,.14)}#archessAuthGate .auth-gate-kicker{font-size:9px;font-weight:950;letter-spacing:.20em;color:#8490a3}#archessAuthGate h2{margin:8px 0 9px;font-size:24px;line-height:1.15;letter-spacing:-.04em}#archessAuthGate p{margin:0 0 20px;color:#8a93a4}#archessAuthGate .auth-gate-btn{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 18px;border-radius:12px;text-decoration:none;color:#081016;background:linear-gradient(135deg,#8df2ff,#957cff);font-size:10px;font-weight:950;letter-spacing:.09em;box-shadow:0 12px 32px rgba(116,233,255,.13)}`; document.head.appendChild(style);
    }

    const setAuthenticated = (authenticated) => {
      window.__ArChessAuthenticated = Boolean(authenticated);
      gate.classList.toggle("hidden", Boolean(authenticated));
      gate.setAttribute("aria-hidden", String(Boolean(authenticated)));
      gate.style.pointerEvents = authenticated ? "none" : "auto";
    };

    const serverAuthenticated = document.body?.dataset?.authenticated === "true";
    setAuthenticated(serverAuthenticated);
    fetch("/api/auth/me", { credentials:"same-origin", cache:"no-store" })
      .then((response) => response.ok ? response.json() : { authenticated:false })
      .then((payload) => setAuthenticated(Boolean(payload?.authenticated)))
      .catch(() => setAuthenticated(serverAuthenticated));

    const newGame=document.getElementById("newGameBtn");
    if (newGame && !newGame.__archessAuthGuard) {
      newGame.__archessAuthGuard=true;
      newGame.addEventListener("click", (event) => {
        if (!window.__ArChessAuthenticated) { event.preventDefault(); event.stopImmediatePropagation(); window.location.assign("/login"); }
      }, true);
    }
    return true;
  };

  const started=performance.now();
  const poll=()=>{ if (install() || performance.now()-started>12000) return; setTimeout(poll,50); };
  poll();
})();
