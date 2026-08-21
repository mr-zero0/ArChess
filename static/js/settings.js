"use strict";

window.BoardSizeManager = (() => {
  const STORAGE_KEY = "archess-board-size";
  const PRESETS = Object.freeze([
    { px: 600, label: "80%" },
    { px: 680, label: "90%" },
    { px: 760, label: "100%" },
    { px: 840, label: "110%" },
    { px: 920, label: "120%" },
  ]);
  const DEFAULT_INDEX = 2;
  const root = document.documentElement;
  let index = DEFAULT_INDEX;
  let minusButton = null;
  let plusButton = null;
  let valueNode = null;

  function storedIndex() {
    try {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY));
      const found = PRESETS.findIndex((preset) => preset.px === stored);
      if (found >= 0) return found;
    } catch (_) {
      // Continue with the default when local storage is unavailable.
    }
    return DEFAULT_INDEX;
  }

  function updateControl() {
    const preset = PRESETS[index];
    if (valueNode) valueNode.textContent = preset.label;
    if (minusButton) minusButton.disabled = index === 0;
    if (plusButton) plusButton.disabled = index === PRESETS.length - 1;
  }

  function apply(nextIndex, persist = true) {
    index = Math.max(0, Math.min(PRESETS.length - 1, nextIndex));
    const preset = PRESETS[index];
    root.style.setProperty("--board-size", `${preset.px}px`);

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(preset.px));
      } catch (_) {
        // Board sizing still works for this session without storage.
      }
    }

    updateControl();
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return preset;
  }

  function smaller() {
    if (index > 0) apply(index - 1);
  }

  function larger() {
    if (index < PRESETS.length - 1) apply(index + 1);
  }

  function init() {
    minusButton = document.getElementById("boardSizeDown");
    plusButton = document.getElementById("boardSizeUp");
    valueNode = document.getElementById("boardSizeValue");
    index = storedIndex();
    apply(index, false);

    if (minusButton) minusButton.addEventListener("click", smaller);
    if (plusButton) plusButton.addEventListener("click", larger);
  }

  return Object.freeze({ init, apply, smaller, larger, presets: PRESETS });
})();
