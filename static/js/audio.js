"use strict";

// Procedural audio for ArChess. Everything is synthesized with the Web Audio
// API so no external sound files are required (zero-budget rule). The
// AudioContext is created lazily on the first user gesture, as required by
// browsers, and all playback routes through master/effects/music gain nodes.

window.AudioManager = (() => {
  const STORAGE_KEY = "archess-audio";

  const DEFAULT_PREFS = Object.freeze({
    master: 0.8,
    effects: 0.9,
    music: 0.35,
    ambient: false,
    mute: false,
    haptics: true,
  });

  let ctx = null;
  let masterGain = null;
  let effectsGain = null;
  let musicGain = null;
  let noiseBuffer = null;
  let ambientNodes = [];
  let prefs = { ...DEFAULT_PREFS };
  let lastPullAt = 0;
  let unlocked = false;

  function loadPrefs() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (stored && typeof stored === "object") {
        prefs = { ...DEFAULT_PREFS, ...stored };
      }
    } catch (_) {
      // Defaults remain when storage is unavailable.
    }
  }

  function savePrefs() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (_) {
      // Settings still apply for this session without storage.
    }
  }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    effectsGain = ctx.createGain();
    musicGain = ctx.createGain();
    effectsGain.connect(masterGain);
    musicGain.connect(masterGain);
    masterGain.connect(ctx.destination);
    noiseBuffer = makeNoiseBuffer(ctx);
    applyVolumes();
    return ctx;
  }

  function makeNoiseBuffer(context) {
    const length = context.sampleRate * 1.0;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function applyVolumes() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const target = prefs.mute ? 0.0001 : prefs.master;
    masterGain.gain.setTargetAtTime(target, now, 0.02);
    effectsGain.gain.setTargetAtTime(prefs.effects, now, 0.02);
    musicGain.gain.setTargetAtTime(prefs.music, now, 0.02);
  }

  function outputLevel() {
    return prefs.mute ? 0 : 1;
  }

  function env(gain, t, volume, attack, duration) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  }

  function tone(options) {
    if (!ctx || prefs.mute) return;
    const {
      freq, freqEnd = freq, type = "sine", duration = 0.12,
      volume = 0.2, attack = 0.008, when = 0,
    } = options;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    const gain = ctx.createGain();
    env(gain, t, volume, attack, duration);
    osc.connect(gain);
    gain.connect(effectsGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function noise(options) {
    if (!ctx || prefs.mute) return;
    const {
      duration = 0.2, volume = 0.2, filterFreq = 1200, filterEnd = filterFreq,
      filterType = "bandpass", q = 1, attack = 0.005, when = 0,
    } = options;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);
    if (filterEnd !== filterFreq) filter.frequency.exponentialRampToValueAtTime(filterEnd, t + duration);
    filter.Q.value = q;
    const gain = ctx.createGain();
    env(gain, t, volume, attack, duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(effectsGain);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  // ---- Sound events -------------------------------------------------------

  function click() {
    tone({ freq: 620, freqEnd: 560, type: "triangle", duration: 0.05, volume: 0.12 });
  }

  function select() {
    tone({ freq: 720, freqEnd: 900, type: "sine", duration: 0.08, volume: 0.22 });
  }

  function pull(power) {
    if (!ctx) return;
    const now = performance.now();
    if (now - lastPullAt < 90) return;
    lastPullAt = now;
    const ratio = Math.max(0, Math.min(1, power));
    tone({
      freq: 130 + ratio * 220,
      type: "triangle",
      duration: 0.07,
      volume: 0.08 + ratio * 0.14,
    });
  }

  function launch(power) {
    const ratio = Math.max(0, Math.min(1, power)) || 0.5;
    noise({
      duration: 0.22 + ratio * 0.1,
      volume: 0.25 + ratio * 0.25,
      filterFreq: 1600,
      filterEnd: 320,
      filterType: "lowpass",
      q: 0.8,
    });
    tone({ freq: 200, freqEnd: 90, type: "sine", duration: 0.18, volume: 0.2 + ratio * 0.12 });
    haptic(ratio > 0.35 ? 25 : 10);
  }

  function impact(intensity) {
    const normalized = Math.max(0, Math.min(1.6, intensity / GAME_CONFIG.impactReferenceSpeed));
    const volume = 0.18 + normalized * 0.5;
    const depth = 150 - normalized * 70;
    noise({
      duration: 0.12 + normalized * 0.1,
      volume,
      filterFreq: 1400 - normalized * 700,
      filterEnd: 300,
      filterType: "lowpass",
      q: 1,
    });
    tone({ freq: depth, freqEnd: depth * 0.5, type: "sine", duration: 0.14 + normalized * 0.08, volume: volume * 0.8 });
    haptic(10 + Math.round(normalized * 30));
  }

  function wall(intensity) {
    const normalized = Math.max(0, Math.min(1.2, intensity / GAME_CONFIG.impactReferenceSpeed));
    noise({
      duration: 0.08,
      volume: 0.12 + normalized * 0.22,
      filterFreq: 900 - normalized * 400,
      filterEnd: 250,
      filterType: "lowpass",
      q: 1,
    });
    tone({ freq: 130, freqEnd: 80, type: "sine", duration: 0.1, volume: 0.14 + normalized * 0.18 });
    haptic(normalized > 0.4 ? 12 : 0);
  }

  function kingHit() {
    tone({ freq: 880, type: "square", duration: 0.09, volume: 0.26 });
    tone({ freq: 660, type: "square", duration: 0.14, volume: 0.26, when: 0.09 });
    haptic(40);
  }

  function destroy(type) {
    noise({
      duration: 0.28,
      volume: 0.5,
      filterFreq: 2500,
      filterEnd: 180,
      filterType: "highpass",
      q: 0.7,
    });
    tone({ freq: 420, freqEnd: 90, type: "sawtooth", duration: 0.26, volume: 0.22 });
    haptic(60);
  }

  function victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      tone({ freq, type: "triangle", duration: 0.18, volume: 0.3, when: index * 0.11 });
    });
  }

  function defeat() {
    const notes = [329.63, 261.63, 220.0, 196.0];
    notes.forEach((freq, index) => {
      tone({ freq, type: "triangle", duration: 0.22, volume: 0.26, when: index * 0.15 });
    });
  }

  function haptic(pattern) {
    if (!prefs.haptics || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch (_) {
      // Vibration is not universally available; ignore failures.
    }
  }

  // ---- Ambience -----------------------------------------------------------

  function startAmbience() {
    if (!ctx || ambientNodes.length) return;
    const duration = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.55, now + 1.6);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    src.start();
    ambientNodes = [src, gain];
  }

  function stopAmbience() {
    if (!ctx || !ambientNodes.length) return;
    const now = ctx.currentTime;
    ambientNodes[1].gain.linearRampToValueAtTime(0.0001, now + 0.6);
    const src = ambientNodes[0];
    window.setTimeout(() => {
      try {
        src.stop();
      } catch (_) {
        // Source may already be stopped.
      }
    }, 700);
    ambientNodes = [];
  }

  function updateAmbience() {
    if (!ctx) return;
    if (prefs.ambient && prefs.music > 0 && !prefs.mute) startAmbience();
    else stopAmbience();
  }

  // ---- Public API ---------------------------------------------------------

  function unlock() {
    if (unlocked) return;
    if (ensure()) {
      if (ctx.state === "suspended") ctx.resume();
      unlocked = true;
      updateAmbience();
    }
  }

  function setPrefs(patch) {
    prefs = { ...prefs, ...patch };
    savePrefs();
    applyVolumes();
    updateAmbience();
    return prefs;
  }

  function getPrefs() {
    return { ...prefs };
  }

  function isAvailable() {
    return Boolean(ctx);
  }

  function init() {
    loadPrefs();
    window.addEventListener("pointerdown", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });
  }

  return Object.freeze({
    init,
    unlock,
    click,
    select,
    pull,
    launch,
    impact,
    wall,
    kingHit,
    destroy,
    victory,
    defeat,
    setPrefs,
    getPrefs,
    isAvailable,
  });
})();
