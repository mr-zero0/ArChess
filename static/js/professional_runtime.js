(() => {
  "use strict";
  if (window.__ArChessProfessionalRuntime) return;
  window.__ArChessProfessionalRuntime = true;

  const SKINS = {
    obsidian: { base: "dark", boardBg: "#05070b", light: "#263747", dark: "#101c29", grid: "rgba(150,210,230,.13)", coord: "rgba(220,240,250,.45)", edgeA: "rgba(112,231,255,.45)", edgeB: "rgba(154,124,255,.32)", white: "#d9e5ec", black: "#242d36", frame: "#0b1118" },
    emerald: { base: "dark", boardBg: "#06100d", light: "#2c5848", dark: "#17362c", grid: "rgba(110,228,190,.15)", coord: "rgba(215,245,233,.47)", edgeA: "rgba(103,244,179,.46)", edgeB: "rgba(69,213,192,.32)", white: "#e9e1c9", black: "#202a26", frame: "#0b2119" },
    walnut: { base: "wood", boardBg: "#0d0805", light: "#d9bd95", dark: "#6e4b32", grid: "rgba(49,26,16,.24)", coord: "rgba(51,29,20,.62)", edgeA: "rgba(241,191,121,.52)", edgeB: "rgba(209,120,86,.34)", white: "#9c553a", black: "#171818", frame: "#3b2617" },
    frost: { base: "light", boardBg: "#071018", light: "#dbe8ef", dark: "#91abba", grid: "rgba(48,106,135,.14)", coord: "rgba(33,68,88,.56)", edgeA: "rgba(95,212,255,.52)", edgeB: "rgba(110,141,255,.30)", white: "#eef3f5", black: "#2a3540", frame: "#1b2a35" },
  };

  let mode = "2d";
  let patched2D = false;
  let patched3D = false;

  function addCss(href, marker) {
    if (document.querySelector(`link[data-${marker}]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset[marker] = "1";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadCss() {
    addCss("/static/css/professional_tokens.css?v=20260825-ui8", "archessProfessionalTokens");
    addCss("/static/css/professional_shell.css?v=20260825-ui8", "archessProfessionalShell");
  }

  function patch2D() {
    if (patched2D || !window.GameRenderer?.prototype) return false;
    const proto = window.GameRenderer.prototype;
    const originalTheme = proto.theme;
    const originalPalette = proto.palette;
    const originalDraw = proto.draw;
    proto.theme = function patchedTheme() { return document.documentElement.dataset.skin || originalTheme.call(this); };
    proto.palette = function patchedPalette() {
      const skin = SKINS[document.documentElement.dataset.skin || "obsidian"] || SKINS.obsidian;
      const base = originalPalette.call(this);
      return {
        ...base,
        boardBg: skin.boardBg,
        squareLight: skin.light,
        squareDark: skin.dark,
        squareLightGlow: skin.base === "light" ? "rgba(255,255,255,.32)" : skin.base === "wood" ? "rgba(255,246,220,.18)" : "rgba(120,220,245,.06)",
        squareDarkGlow: skin.base === "wood" ? "rgba(255,220,175,.045)" : "rgba(255,255,255,.018)",
        grid: skin.grid,
        coord: skin.coord,
        edgeA: skin.edgeA,
        edgeB: skin.edgeB,
        trailWhite: skin.base === "wood" ? "#e08a61" : "#70e7ff",
        trailBlack: skin.base === "light" ? "#df5265" : skin.base === "wood" ? "#8b9595" : "#ff7585",
      };
    };
    proto.draw = function patchedDraw(game) { if (mode === "3d") return; return originalDraw.call(this, game); };
    patched2D = true;
    return true;
  }

  function patch3D() {
    if (patched3D || !window.ThreeDScene?.prototype) return false;
    const proto = window.ThreeDScene.prototype;
    const originalRender = proto.render;
    const originalSetTheme = proto.setTheme;
    proto.render = function patchedRender(game, delta) { if (mode === "2d") return; return originalRender.call(this, game, delta); };
    proto.setTheme = function patchedSetTheme() {
      const skinName = document.documentElement.dataset.skin || "obsidian";
      const skin = SKINS[skinName] || SKINS.obsidian;
      originalSetTheme.call(this, skin.base);
      this.theme = skinName;
      try {
        this.scene.background?.set?.(skin.boardBg);
        this.frame?.material?.color?.set?.(skin.frame);
        this.tileMats?.light?.color?.set?.(skin.light);
        this.tileMats?.dark?.color?.set?.(skin.dark);
        this.materials?.white?.color?.set?.(skin.white);
        this.materials?.black?.color?.set?.(skin.black);
        for (const entry of this.entries.values()) {
          entry.group.traverse((node) => {
            if (node.isMesh && node !== entry.shadow && node !== entry.glow) node.material = this.materials[entry.team];
          });
        }
      } catch (_) {}
    };
    patched3D = true;
    return true;
  }

  function setMode(nextMode) {
    if (nextMode !== "2d" && nextMode !== "3d") return;
    if (nextMode === "3d" && window.__ArChess3DUnavailable) nextMode = "2d";
    mode = nextMode;
    document.body.dataset.renderMode = mode;
    document.body.classList.toggle("archess-mode-2d", mode === "2d");
    document.body.classList.toggle("archess-mode-3d", mode === "3d");
    
    // Explicitly update visibility classes to ensure canvas swapping
    const gameCanvas = document.getElementById("gameCanvas");
    const glCanvas = document.getElementById("glCanvas");
    if (gameCanvas) gameCanvas.style.display = (mode === "2d") ? "block" : "none";
    if (glCanvas) glCanvas.style.display = (mode === "3d") ? "block" : "none";
  }

  window.ArChessRenderMode = { get mode() { return mode; }, set: setMode };

  function applySkin() {
    const skin = document.documentElement.dataset.skin || "obsidian";
    const data = SKINS[skin] || SKINS.obsidian;
    document.documentElement.dataset.theme = data.base;
    window.dispatchEvent(new CustomEvent("archess:themechange", { detail: { theme: data.base, skin } }));
  }

  function boot() {
    loadCss();
    document.body.classList.add("archess-professional-ui");
    patch2D();
    patch3D();
    applySkin();
    if (window.ArChessProfessionalUI?.state) mode = window.ArChessProfessionalUI.state.mode;
    setMode(mode);
    window.ArChessProfessionalUI?.recalcBoard?.();
    return patched2D && (patched3D || window.__ArChess3DUnavailable);
  }

  const start = performance.now();
  const poll = () => { if (boot() || performance.now() - start < 15000) setTimeout(poll, 50); };
  poll();
})();
