(() => {
  "use strict";
  if (window.__ArChessProfessionalUI) return;
  window.__ArChessProfessionalUI = true;

  const THEMES = [
    ["obsidian", "OBSIDIAN", "CYAN / VIOLET"],
    ["emerald", "EMERALD", "MINT / TEAL"],
    ["walnut", "WALNUT", "AMBER / COPPER"],
    ["frost", "FROST", "ICE / SAPPHIRE"],
  ];
  const SIZE_STEPS = [68, 76, 84, 92];

  const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value == null ? fallback : value; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };

  function setSkin(skin) {
    document.documentElement.dataset.skin = skin;
    save("archess-skin", skin);
    const theme = skin === "walnut" ? "wood" : skin === "frost" ? "light" : skin === "emerald" ? "dark" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("archess-theme", theme); } catch {}
    window.dispatchEvent(new CustomEvent("archess:skinchange", { detail: { skin, theme } }));
  }

  function setBoardSize(value) {
    const size = SIZE_STEPS.reduce((best, item) => Math.abs(item - value) < Math.abs(best - value) ? item : best, SIZE_STEPS[1]);
    document.documentElement.style.setProperty("--archess-board-size", `${size}vh`);
    document.body.dataset.boardSize = String(size);
    save("archess-board-size", size);
    const valueNode = document.getElementById("archessBoardSizeValue");
    if (valueNode) valueNode.textContent = `${Math.round(size / 0.76)}%`;
    window.dispatchEvent(new CustomEvent("archess:boardsizechange", { detail: { size } }));
  }

  function setMode(mode) {
    // TEMPORARY: Force 2D mode, disabling 3D switching until further notice.
    const value = "2d";
    document.body.classList.toggle("archess-mode-3d", false);
    document.body.classList.toggle("archess-mode-2d", true);
    document.body.dataset.renderMode = value;
    document.querySelectorAll("[data-archess-mode]").forEach(button => {
        const is3d = button.dataset.archessMode === "3d";
        if (is3d) {
            button.remove();
            return;
        }
        button.setAttribute("aria-pressed", String(button.dataset.archessMode === value));
    });
    save("archess-render-mode", value);
    const badge = document.getElementById("archessModeValue");
    if (badge) badge.textContent = value.toUpperCase();
    window.dispatchEvent(new CustomEvent("archess:rendermodechange", { detail: { mode: value } }));
    return value;
  }

  function themeMenu() {
    return `<div class="archess-theme-menu" id="archessThemeMenu">${THEMES.map(([id,title,sub]) => `<button type="button" class="archess-theme-choice" data-skin="${id}"><span>${title}</span><small>${sub}</small></button>`).join("")}</div>`;
  }

  function inject() {
    if (document.getElementById("archessProToolbar")) return;
    const zone = document.querySelector(".board-zone");
    if (!zone) return;
    const toolbar = document.createElement("div");
    toolbar.id = "archessProToolbar";
    toolbar.className = "archess-pro-toolbar";
    toolbar.innerHTML = `
      <wa-button-group label="Renderer">
        <wa-button appearance="filled" data-archess-mode="2d" aria-pressed="true">2D ARENA</wa-button>
      </wa-button-group>
      <span class="archess-mode-badge">ACTIVE <b id="archessModeValue">2D</b></span>
      <div class="archess-board-meter" aria-label="Board size">
        <button id="archessBoardMinus" type="button" aria-label="Smaller board">−</button>
        <strong id="archessBoardSizeValue">100%</strong>
        <button id="archessBoardPlus" type="button" aria-label="Larger board">+</button>
      </div>
      <div class="archess-theme-popover">
        <wa-button appearance="filled" id="archessThemeButton" aria-haspopup="menu">THEME</wa-button>
        ${themeMenu()}
      </div>
    `;
    zone.insertBefore(toolbar, zone.querySelector(".board-frame"));

    toolbar.querySelectorAll("[data-archess-mode]").forEach(button => button.addEventListener("click", () => setMode(button.dataset.archessMode)));
    toolbar.querySelector("#archessBoardMinus").onclick = () => { const current = Number(read("archess-board-size", 76)); setBoardSize(current - 1); };
    toolbar.querySelector("#archessBoardPlus").onclick = () => { const current = Number(read("archess-board-size", 76)); setBoardSize(current + 1); };
    const menu = toolbar.querySelector("#archessThemeMenu");
    toolbar.querySelector("#archessThemeButton").onclick = event => { event.stopPropagation(); menu.classList.toggle("open"); };
    toolbar.querySelectorAll(".archess-theme-choice").forEach(button => button.addEventListener("click", () => { setSkin(button.dataset.skin); menu.classList.remove("open"); }));
    document.addEventListener("click", () => menu.classList.remove("open"));
  }

  function init() {
    document.body.classList.add("archess-professional-ui");
    setSkin(read("archess-skin", "obsidian"));
    setBoardSize(Number(read("archess-board-size", 76)));
    inject();
    setMode("2d");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
