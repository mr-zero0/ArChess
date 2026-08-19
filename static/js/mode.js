"use strict";

// STEP 8 game modes: Match (default, destroy the King) and Practice / Sandbox
// (no win condition — keep experimenting). An optional per-turn timer forces
// the current player to move within a time limit. Prefs persist in localStorage.

window.GameModeManager = (() => {
  const STORAGE_KEY = "archess-game";

  const DEFAULT = Object.freeze({
    mode: "match",
    turnTime: 0,
  });

  let prefs = { ...DEFAULT };
  let initialized = false;
  let onChange = null;

  function setChangeHandler(handler) {
    onChange = handler;
  }

  function load() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (stored && typeof stored === "object") {
        const mode = stored.mode === "practice" || stored.mode === "match" || stored.mode === "challenge" ? stored.mode : DEFAULT.mode;
        const turnTime = Number.isFinite(Number(stored.turnTime)) ? Math.max(0, Number(stored.turnTime)) : 0;
        prefs = { mode, turnTime };
      }
    } catch (_) {
      // Defaults remain when storage is unavailable.
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (_) {
      // Settings still apply for this session without storage.
    }
  }

  function setMode(mode) {
    if (mode !== "match" && mode !== "practice" && mode !== "challenge") return prefs;
    prefs = { ...prefs, mode };
    save();
    if (onChange) onChange({ ...prefs });
    return prefs;
  }

  function setTurnTime(seconds) {
    const value = Number(seconds);
    prefs = { ...prefs, turnTime: Number.isFinite(value) ? Math.max(0, value) : 0 };
    save();
    if (onChange) onChange({ ...prefs });
    return prefs;
  }

  function get() {
    return { ...prefs };
  }

  function applyControls() {
    const match = document.getElementById("modeMatch");
    const practice = document.getElementById("modePractice");
    const turnTime = document.getElementById("turnTime");
    if (match) match.checked = prefs.mode === "match";
    if (practice) practice.checked = prefs.mode === "practice";
    if (turnTime) turnTime.value = String(prefs.turnTime);
  }

  function wire() {
    const match = document.getElementById("modeMatch");
    const practice = document.getElementById("modePractice");
    const turnTime = document.getElementById("turnTime");
    match?.addEventListener("change", () => setMode("match"));
    practice?.addEventListener("change", () => setMode("practice"));
    turnTime?.addEventListener("change", () => setTurnTime(Number(turnTime.value)));
  }

  function init() {
    if (initialized) return;
    initialized = true;
    load();
    wire();
    applyControls();
  }

  return Object.freeze({ init, get, setMode, setTurnTime, applyControls, setChangeHandler });
})();
