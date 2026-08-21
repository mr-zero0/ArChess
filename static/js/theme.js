"use strict";

window.ThemeManager = (() => {
  const STORAGE_KEY = "archess-theme";
  const THEMES = Object.freeze(["wood", "dark", "light"]);
  const root = document.documentElement;
  let button = null;
  let icon = null;
  let label = null;
  let themeMeta = null;

  function isValid(theme) {
    return THEMES.includes(theme);
  }

  function preferredTheme() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isValid(stored)) return stored;
    } catch (_) {
      // Storage can be unavailable in locked-down browser contexts.
    }
    // Wood is intentionally the ArChess default visual identity.
    return "wood";
  }

  function current() {
    const theme = root.dataset.theme;
    return isValid(theme) ? theme : "wood";
  }

  function nextTheme(theme) {
    const index = THEMES.indexOf(theme);
    return THEMES[(index + 1) % THEMES.length];
  }

  function themeInfo(theme) {
    if (theme === "dark") return { icon: "◐", label: "DARK", color: "#070b11" };
    if (theme === "light") return { icon: "☀", label: "LIGHT", color: "#eef4f8" };
    return { icon: "◆", label: "WOOD", color: "#2b1810" };
  }

  function updateControl(theme) {
    if (!button) return;
    const next = nextTheme(theme);
    const info = themeInfo(theme);
    button.setAttribute("aria-label", `Theme: ${theme}. Switch to ${next}.`);
    button.setAttribute("title", `Theme: ${theme}. Click for ${next}.`);
    if (icon) icon.textContent = info.icon;
    if (label) label.textContent = info.label;
    if (themeMeta) themeMeta.setAttribute("content", info.color);
  }

  function apply(theme, persist = true) {
    const normalized = isValid(theme) ? theme : "wood";
    root.dataset.theme = normalized;
    root.style.colorScheme = normalized === "light" ? "light" : "dark";

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, normalized);
      } catch (_) {
        // Theme still works for this session without storage.
      }
    }

    updateControl(normalized);
    window.dispatchEvent(new CustomEvent("archess:themechange", { detail: { theme: normalized } }));
    return normalized;
  }

  function toggle() {
    return apply(nextTheme(current()));
  }

  function init() {
    button = document.getElementById("themeBtn");
    icon = document.getElementById("themeIcon");
    label = document.getElementById("themeLabel");
    themeMeta = document.getElementById("themeColor");

    const initial = isValid(root.dataset.theme) ? root.dataset.theme : preferredTheme();
    apply(initial, false);

    if (button) button.addEventListener("click", toggle);
  }

  return Object.freeze({ init, apply, toggle, current, preferredTheme, themes: THEMES });
})();
