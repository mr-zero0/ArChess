(() => {
  "use strict";
  if (window.__ArChessProfessionalShell) return;
  window.__ArChessProfessionalShell = true;

  const SKINS = {
    obsidian: { label: "Obsidian", baseTheme: "dark" },
    emerald: { label: "Emerald", baseTheme: "dark" },
    walnut: { label: "Walnut", baseTheme: "wood" },
    frost: { label: "Frost", baseTheme: "light" },
  };
  const MODES = ["2d", "3d"];
  const DEFAULT = { skin: "obsidian", mode: "2d", scale: 1 };
  const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };

  const state = {
    skin: SKINS[read("archess-ui-skin", "obsidian")] ? read("archess-ui-skin", "obsidian") : DEFAULT.skin,
    mode: MODES.includes(read("archess-view-mode", DEFAULT.mode)) ? read("archess-view-mode", DEFAULT.mode) : DEFAULT.mode,
    scale: Number(read("archess-board-scale", "1")) || 1,
    focus: false,
    theatre: false,
  };

  const root = document.documentElement;
  const body = document.body;
  const oldShell = () => document.querySelector(".archess-ui");
  const $ = (sel, rootEl = document) => rootEl.querySelector(sel);

  function loadWebAwesome() {
    if (!document.querySelector('link[data-archess-wa]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.archessWa = "1";
      link.href = "https://ka-f.webawesome.com/%40awesome.me/webawesome%403.12.0/styles/themes/default.css";
      document.head.appendChild(link);
      const utilities = document.createElement("link");
      utilities.rel = "stylesheet";
      utilities.dataset.archessWa = "1";
      utilities.href = "https://ka-f.webawesome.com/%40awesome.me/webawesome%403.12.0/styles/utilities.css";
      document.head.appendChild(utilities);
    }
    if (!document.querySelector('script[data-archess-wa]')) {
      const script = document.createElement("script");
      script.type = "module";
      script.dataset.archessWa = "1";
      script.src = "https://ka-f.webawesome.com/%40awesome.me/webawesome%403.12.0/webawesome.loader.js";
      document.head.appendChild(script);
    }
  }

  function applySkin(skin = state.skin) {
    if (!SKINS[skin]) skin = DEFAULT.skin;
    state.skin = skin;
    root.dataset.skin = skin;
    root.dataset.theme = SKINS[skin].baseTheme;
    write("archess-ui-skin", skin);
    document.dispatchEvent(new CustomEvent("archess:themechange", { detail: { skin, theme: SKINS[skin].baseTheme } }));
    window.dispatchEvent(new CustomEvent("archess:themechange", { detail: { skin, theme: SKINS[skin].baseTheme } }));
    updateThemeMenu();
  }

  function applyMode(mode = state.mode) {
    if (!MODES.includes(mode)) mode = DEFAULT.mode;
    if (mode === "3d" && window.__ArChess3DUnavailable) mode = "2d";
    state.mode = mode;
    write("archess-view-mode", mode);
    body.dataset.renderMode = mode;
    body.classList.toggle("archess-mode-2d", mode === "2d");
    body.classList.toggle("archess-mode-3d", mode === "3d");
    root.dataset.renderMode = mode;
    if (window.ArChessRenderMode?.set) window.ArChessRenderMode.set(mode);
    updateModeButtons();
    requestAnimationFrame(() => recalcBoard());
  }

  function toggleScale(delta) {
    state.scale = Math.max(0.78, Math.min(1.12, Math.round((state.scale + delta) * 100) / 100));
    write("archess-board-scale", String(state.scale));
    recalcBoard();
    updateScaleLabel();
  }

  function recalcBoard() {
    const layout = $(".game-layout");
    if (!layout) return;
    const narrow = innerWidth < 1180;
    const mobile = innerWidth < 760;
    const sideBudget = narrow ? 28 : 430;
    const topBudget = 92;
    const bottomBudget = mobile ? 76 : 34;
    const focusBoost = state.focus || state.theatre ? 1.08 : 1;
    const maxByHeight = Math.max(260, innerHeight - topBudget - bottomBudget);
    const maxByWidth = Math.max(260, innerWidth - sideBudget);
    const max = Math.min(maxByHeight, maxByWidth, 980) * state.scale * focusBoost;
    const size = Math.max(260, Math.min(max, Math.min(innerHeight - 72, innerWidth - 18)));
    root.style.setProperty("--archess-board-size", `${Math.round(size)}px`);
    root.style.setProperty("--archess-board-scale", String(state.scale));
    window.dispatchEvent(new Event("resize"));
  }

  function updateModeButtons() {
    document.querySelectorAll("[data-archess-mode]").forEach((button) => {
      const active = button.dataset.archessMode === state.mode;
      button.setAttribute("aria-pressed", String(active));
      button.toggleAttribute("disabled", state.mode === button.dataset.archessMode);
    });
    const label = $("#archessModeLabel");
    if (label) label.textContent = state.mode === "3d" ? "3D" : "2D";
  }

  function updateScaleLabel() {
    const label = $("#archessScaleLabel");
    if (label) label.textContent = `${Math.round(state.scale * 100)}%`;
  }

  function updateThemeMenu() {
    document.querySelectorAll("[data-archess-skin]").forEach((button) => {
      const active = button.dataset.archessSkin === state.skin;
      button.setAttribute("aria-selected", String(active));
    });
    const label = $("#archessThemeLabel");
    if (label) label.textContent = SKINS[state.skin].label;
  }

  function setFocus(enabled) {
    state.focus = Boolean(enabled);
    if (state.focus) state.theatre = false;
    body.classList.toggle("archess-focus-mode", state.focus);
    body.classList.toggle("archess-theatre-mode", state.theatre);
    requestAnimationFrame(recalcBoard);
    updateViewButtons();
  }

  function setTheatre(enabled) {
    state.theatre = Boolean(enabled);
    if (state.theatre) state.focus = false;
    body.classList.toggle("archess-focus-mode", state.focus);
    body.classList.toggle("archess-theatre-mode", state.theatre);
    requestAnimationFrame(recalcBoard);
    updateViewButtons();
  }

  function updateViewButtons() {
    const focus = $("#archessFocusBtn");
    const theatre = $("#archessTheatreBtn");
    focus?.setAttribute("aria-pressed", String(state.focus));
    theatre?.setAttribute("aria-pressed", String(state.theatre));
  }

  function build() {
    if (!document.querySelector(".app-shell") || document.querySelector("#archessProfessionalShell")) return;
    loadWebAwesome();
    oldShell()?.setAttribute("aria-hidden", "true");

    const shell = document.createElement("div");
    shell.id = "archessProfessionalShell";
    shell.className = "archess-professional-shell";
    shell.innerHTML = `
      <header class="aps-topbar">
        <div class="aps-brand" aria-label="ArChess">
          <span class="aps-brand-mark">♜</span>
          <span class="aps-brand-copy"><strong>ArChess</strong><small>PHYSICS CHESS</small></span>
        </div>
        <div class="aps-center-controls">
          <wa-button-group label="Render mode" class="aps-mode-group">
            <wa-button size="small" data-archess-mode="2d" variant="neutral">2D</wa-button>
            <wa-button size="small" data-archess-mode="3d" variant="neutral">3D</wa-button>
          </wa-button-group>
          <span class="aps-divider"></span>
          <div class="aps-menu-wrap">
            <wa-button size="small" variant="neutral" id="archessThemeButton">Theme <span id="archessThemeLabel">Obsidian</span></wa-button>
            <div class="aps-menu aps-theme-menu" id="archessThemeMenu" role="listbox" aria-label="Theme">
              <button type="button" data-archess-skin="obsidian" role="option"><i class="skin-dot obsidian"></i><span>Obsidian</span><small>Graphite / cyan</small></button>
              <button type="button" data-archess-skin="emerald" role="option"><i class="skin-dot emerald"></i><span>Emerald</span><small>Deep green / jade</small></button>
              <button type="button" data-archess-skin="walnut" role="option"><i class="skin-dot walnut"></i><span>Walnut</span><small>Wood / brass</small></button>
              <button type="button" data-archess-skin="frost" role="option"><i class="skin-dot frost"></i><span>Frost</span><small>Ice / steel</small></button>
            </div>
          </div>
          <div class="aps-size" aria-label="Board size">
            <button type="button" id="archessBoardMinus" aria-label="Smaller board">−</button>
            <strong id="archessScaleLabel">100%</strong>
            <button type="button" id="archessBoardPlus" aria-label="Larger board">+</button>
          </div>
        </div>
        <div class="aps-actions">
          <wa-button size="small" variant="neutral" id="archessFocusBtn" aria-pressed="false">Focus</wa-button>
          <wa-button size="small" variant="neutral" id="archessTheatreBtn" aria-pressed="false">Theatre</wa-button>
          <wa-button size="small" variant="brand" id="archessNewGameBtn">New game</wa-button>
        </div>
      </header>
      <div class="aps-stage">
        <aside class="aps-player aps-player-left" aria-label="White player">
          <div class="aps-player-head"><span class="aps-live-dot white"></span><strong>WHITE</strong><span id="archessTurnPill">YOUR TURN</span></div>
          <div class="aps-hp-row"><strong id="archessWhiteHp">120</strong><span>HP</span></div>
          <div class="aps-hp-track"><i id="archessWhiteHpBar"></i></div>
          <div class="aps-meta" id="archessWhiteTimer">READY</div>
        </aside>
        <aside class="aps-context" aria-label="Game information">
          <div class="aps-context-card" id="archessContextCard">
            <div class="aps-card-kicker" id="archessContextKicker">BATTLE</div>
            <div class="aps-card-title" id="archessContextTitle">White to move</div>
            <div class="aps-card-value" id="archessContextValue">Select a piece</div>
            <div class="aps-progress"><i id="archessPowerBar"></i></div>
            <div class="aps-card-meta"><span id="archessPowerText">0% POWER</span><span id="archessPhaseText">AIM</span></div>
          </div>
          <div class="aps-context-card aps-context-secondary">
            <div class="aps-card-kicker">BLACK</div>
            <div class="aps-hp-row"><strong id="archessBlackHp">120</strong><span>HP</span></div>
            <div class="aps-hp-track enemy"><i id="archessBlackHpBar"></i></div>
            <div class="aps-meta" id="archessBlackStatus">OPPONENT</div>
          </div>
        </aside>
      </div>
      <div class="aps-bottom-bar">
        <div class="aps-status"><span class="aps-status-dot"></span><strong id="archessStatusText">WHITE TO MOVE</strong><span id="archessFeedback">Drag backward and release</span></div>
        <div class="aps-bottom-actions"><button type="button" id="archessHelpBtn">Help</button><button type="button" id="archessSettingsBtn">Settings</button></div>
      </div>`;
    document.body.appendChild(shell);

    $("#archessNewGameBtn").addEventListener("click", () => $("#newGameBtn")?.click());
    $("#archessHelpBtn").addEventListener("click", () => $("#helpBtn")?.click());
    $("#archessSettingsBtn").addEventListener("click", () => $("#settingsBtn")?.click());
    $("#archessBoardMinus").addEventListener("click", () => toggleScale(-0.06));
    $("#archessBoardPlus").addEventListener("click", () => toggleScale(0.06));
    $("#archessFocusBtn").addEventListener("click", () => setFocus(!state.focus));
    $("#archessTheatreBtn").addEventListener("click", () => setTheatre(!state.theatre));
    $("#archessThemeButton").addEventListener("click", () => $("#archessThemeMenu")?.classList.toggle("open"));
    document.addEventListener("pointerdown", (event) => { if (!event.target.closest(".aps-menu-wrap")) $("#archessThemeMenu")?.classList.remove("open"); });
    document.querySelectorAll("[data-archess-skin]").forEach((button) => button.addEventListener("click", () => { applySkin(button.dataset.archessSkin); $("#archessThemeMenu")?.classList.remove("open"); }));
    document.querySelectorAll("[data-archess-mode]").forEach((button) => button.addEventListener("click", () => applyMode(button.dataset.archessMode)));

    applySkin(state.skin);
    updateScaleLabel();
    applyMode(state.mode);
    updateViewButtons();
    recalcBoard();
    syncState();
    const syncTimer = setInterval(syncState, 80);
    window.addEventListener("beforeunload", () => clearInterval(syncTimer), { once: true });
  }

  function syncState() {
    const game = window.gameState;
    if (!game) return;
    const white = game.pieces?.filter?.((p) => p.team === "white" && p.type === "king")?.[0];
    const black = game.pieces?.filter?.((p) => p.team === "black" && p.type === "king")?.[0];
    const selected = game.selectedPiece;
    const whiteHp = white ? Math.max(0, Math.round(white.hp)) : 120;
    const blackHp = black ? Math.max(0, Math.round(black.hp)) : 120;
    const maxWhite = white?.maxHp || 120;
    const maxBlack = black?.maxHp || 120;
    const power = Math.round((game.powerRatio || 0) * 100);
    $("#archessWhiteHp").textContent = String(whiteHp);
    $("#archessBlackHp").textContent = String(blackHp);
    $("#archessWhiteHpBar").style.width = `${Math.min(100, (whiteHp / maxWhite) * 100)}%`;
    $("#archessBlackHpBar").style.width = `${Math.min(100, (blackHp / maxBlack) * 100)}%`;
    const turn = (game.currentPlayer || "white").toUpperCase();
    $("#archessStatusText").textContent = game.gameOver ? `${(game.winner || turn).toUpperCase()} WINS` : `${turn} TO MOVE`;
    $("#archessTurnPill").textContent = game.currentPlayer === "white" ? "YOUR TURN" : "OPPONENT";
    $("#archessContextKicker").textContent = selected ? "SELECTED PIECE" : "BATTLE";
    $("#archessContextTitle").textContent = selected ? `${selected.type.toUpperCase()} · ${selected.team.toUpperCase()}` : `${turn} to move`;
    $("#archessContextValue").textContent = selected ? `${Math.round(selected.hp)} HP` : (game.feedback?.text || "Select a living piece");
    $("#archessPowerBar").style.width = `${power}%`;
    $("#archessPowerText").textContent = `${power}% POWER`;
    $("#archessPhaseText").textContent = String(game.phase || "aim").toUpperCase();
    $("#archessFeedback").textContent = game.dragging ? "Release to launch" : (game.feedback?.text || (game.phase === "physics" ? "Resolving impact…" : "Drag backward and release"));
    $("#archessWhiteTimer").textContent = game.currentPlayer === "white" && game.turnTimeLeft > 0 ? `${Math.ceil(game.turnTimeLeft)}s` : "READY";
    $("#archessBlackStatus").textContent = game.currentPlayer === "black" ? "YOUR TURN" : "OPPONENT";
  }

  function expose() {
    window.ArChessProfessionalUI = { applySkin, applyMode, setFocus, setTheatre, recalcBoard, state };
  }

  const boot = () => { build(); expose(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
