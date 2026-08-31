"use strict";

// Accessibility / preference settings for ArChess. Controls audio volume and
// mute through AudioManager, plus motion-related accessibility toggles
// (screen shake, reduced motion, haptics). Preferences persist in localStorage.

window.PrefsManager = (() => {
  const STORAGE_KEY = "archess-motion";

  const DEFAULT_MOTION = Object.freeze({
    shake: true,
    reducedMotion: false,
  });

  let motion = { ...DEFAULT_MOTION };
  let initialized = false;

  function loadMotion() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (stored && typeof stored === "object") {
        motion = { ...DEFAULT_MOTION, ...stored };
      }
    } catch (_) {
      // Defaults remain when storage is unavailable.
    }
  }

  function saveMotion() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(motion));
    } catch (_) {
      // Settings still apply for this session without storage.
    }
  }

  function setMotion(patch) {
    motion = { ...motion, ...patch };
    saveMotion();
    dispatch();
    return motion;
  }

  function getMotion() {
    return { ...motion };
  }

  function dispatch() {
    window.dispatchEvent(new CustomEvent("archess:prefschange", { detail: { motion: getMotion() } }));
  }

  function wireSlider(id, onInput) {
    const input = document.getElementById(id);
    if (!input) return null;
    input.addEventListener("input", () => {
      onInput(Number(input.value));
      applyControls();
    });
    return input;
  }

  function wireCheckbox(id, onInput) {
    const input = document.getElementById(id);
    if (!input) return null;
    input.addEventListener("change", () => {
      onInput(input.checked);
      applyControls();
    });
    return input;
  }

  function applyControls() {
    const audio = window.AudioManager;
    if (!audio || !audio.isAvailable()) {
      // Keep sliders live even before the first sound plays; they are applied
      // once the AudioContext exists.
    }
    const prefs = audio ? audio.getPrefs() : null;

    const master = document.getElementById("volMaster");
    const effects = document.getElementById("volEffects");
    const music = document.getElementById("volMusic");
    const mute = document.getElementById("toggleMute");
    const ambient = document.getElementById("toggleAmbient");
    const shake = document.getElementById("toggleShake");
    const reduced = document.getElementById("toggleReduced");
    const haptics = document.getElementById("toggleHaptics");
    const hapticRow = document.getElementById("hapticRow");

    if (prefs && master) master.value = Math.round(prefs.master * 100);
    if (prefs && effects) effects.value = Math.round(prefs.effects * 100);
    if (prefs && music) music.value = Math.round(prefs.music * 100);
    if (prefs && mute) mute.checked = prefs.mute;
    if (prefs && ambient) ambient.checked = prefs.ambient;
    if (shake) shake.checked = motion.shake;
    if (reduced) reduced.checked = motion.reducedMotion;
    if (haptics) haptics.checked = motion.reducedMotion ? false : (prefs ? prefs.haptics : true);
    if (hapticRow) hapticRow.classList.toggle("disabled", motion.reducedMotion);
  }

  function wire() {
    wireSlider("volMaster", (value) => AudioManager.setPrefs({ master: value / 100 }));
    wireSlider("volEffects", (value) => AudioManager.setPrefs({ effects: value / 100 }));
    wireSlider("volMusic", (value) => AudioManager.setPrefs({ music: value / 100 }));
    wireCheckbox("toggleMute", (checked) => AudioManager.setPrefs({ mute: checked }));
    wireCheckbox("toggleAmbient", (checked) => AudioManager.setPrefs({ ambient: checked }));
    wireCheckbox("toggleShake", (checked) => setMotion({ shake: checked }));
    wireCheckbox("toggleReduced", (checked) => setMotion({ reducedMotion: checked }));
    wireCheckbox("toggleHaptics", (checked) => AudioManager.setPrefs({ haptics: checked }));
  }

  function init() {
    if (initialized) return;
    initialized = true;
    loadMotion();
    wire();
    applyControls();
  }

  return Object.freeze({ init, getMotion, setMotion, applyControls });
})();
