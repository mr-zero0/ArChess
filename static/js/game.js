/**
 * ARCHESS - Full 32-Piece Tactical Chessboard Engine
 * Supports 2D Orthographic & 3D Isometric Perspective Modes,
 * Board Themes (Midnight, Woodland, Ivory), Piece Styles (Classic, Outline, Mono),
 * Turn System, Keyboard Gameplay Parity, and Live Structured Telemetry.
 */

class ArchessAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.audioBus = null;
    this.convolver = null;
    this.convolverGain = null;
    this.dryGain = null;
    this.muted = localStorage.getItem('archess_audio_muted') === 'true';
    this.masterVolume = parseFloat(localStorage.getItem('archess_master_volume') || '0.8');
    this.soundProfile = localStorage.getItem('archess_sound_profile') || 'marble';
    this.environment = localStorage.getItem('archess_acoustic_environment') || 'citadel';
    this.suddenDeathDrone = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.dryGain = this.ctx.createGain();
        this.convolver = this.ctx.createConvolver();
        this.convolverGain = this.ctx.createGain();
        this.audioBus = this.ctx.createGain();

        // Connect acoustic routing graph
        this.updateImpulseResponse();
        this.audioBus.connect(this.dryGain);
        this.audioBus.connect(this.convolver);
        this.convolver.connect(this.convolverGain);

        this.dryGain.connect(this.masterGain);
        this.convolverGain.connect(this.masterGain);

        this.updateEnvironmentGains();
        this.updateMasterGain();
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateMasterGain() {
    if (!this.masterGain || !this.ctx) return;
    const effectiveVol = this.muted ? 0 : Math.max(0, Math.min(1, this.masterVolume));
    try {
      this.masterGain.gain.setTargetAtTime(effectiveVol, this.ctx.currentTime, 0.02);
    } catch(e) {
      this.masterGain.gain.value = effectiveVol;
    }
  }

  updateImpulseResponse() {
    if (!this.ctx || !this.convolver) return;
    try {
      const sampleRate = this.ctx.sampleRate;
      let duration, decay;
      if (this.environment === 'wood') {
        duration = 0.7;
        decay = 3.8;
      } else if (this.environment === 'void') {
        duration = 1.2;
        decay = 2.0;
      } else if (this.environment === 'cathedral') {
        duration = 3.0;
        decay = 1.6;
      } else { // 'citadel'
        duration = 1.8;
        decay = 2.4;
      }
      const length = Math.floor(sampleRate * duration);
      const impulse = this.ctx.createBuffer(2, length, sampleRate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const t = i / length;
        const envFactor = Math.pow(1 - t, decay);
        const mod = this.environment === 'void' ? Math.sin(i * 0.08) * 0.35 + 0.65 : 1;
        left[i] = (Math.random() * 2 - 1) * envFactor * mod;
        right[i] = (Math.random() * 2 - 1) * envFactor * mod;
      }
      this.convolver.buffer = impulse;
    } catch(e) {}
  }

  updateEnvironmentGains() {
    if (!this.dryGain || !this.convolverGain) return;
    let wet = 0.32;
    let dry = 0.85;
    if (this.environment === 'wood') {
      wet = 0.18;
      dry = 0.92;
    } else if (this.environment === 'void') {
      wet = 0.42;
      dry = 0.72;
    } else if (this.environment === 'cathedral') {
      wet = 0.50;
      dry = 0.68;
    } else { // citadel
      wet = 0.32;
      dry = 0.85;
    }
    this.dryGain.gain.value = dry;
    this.convolverGain.gain.value = wet;
  }

  setEnvironment(env) {
    if (['citadel', 'wood', 'void', 'cathedral'].includes(env)) {
      this.environment = env;
      localStorage.setItem('archess_acoustic_environment', env);
      if (this.ctx) {
        this.updateImpulseResponse();
        this.updateEnvironmentGains();
      }
    }
  }

  getEnvironment() {
    return this.environment;
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(volume)));
    localStorage.setItem('archess_master_volume', this.masterVolume.toString());
    this.updateMasterGain();
  }

  setProfile(profile) {
    if (['marble', 'cyber', 'classic'].includes(profile)) {
      this.soundProfile = profile;
      localStorage.setItem('archess_sound_profile', profile);
    }
  }

  toggleMute(isMuted = null) {
    this.muted = (isMuted !== null) ? Boolean(isMuted) : !this.muted;
    localStorage.setItem('archess_audio_muted', this.muted ? 'true' : 'false');
    this.updateMasterGain();
    return this.muted;
  }

  // Slingshot Pull Tension feedback
  playTension(powerRatio) {
    if (this.muted || !this.ctx || powerRatio < 0.08) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      if (this.soundProfile === 'cyber') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140 + powerRatio * 320, now);
        osc.frequency.linearRampToValueAtTime(160 + powerRatio * 360, now + 0.05);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80 + powerRatio * 180, now);
        osc.frequency.linearRampToValueAtTime(95 + powerRatio * 210, now + 0.05);
      }

      const vol = Math.min(0.08 * powerRatio, 0.12);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.audioBus || this.masterGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch(e) {}
  }

  // Slingshot Release Snap
  playLaunch(powerRatio) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (this.soundProfile === 'cyber') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(850 * powerRatio + 200, now + 0.15);
        gain.gain.setValueAtTime(0.3 * powerRatio, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      } else if (this.soundProfile === 'classic') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(420 * powerRatio + 160, now + 0.12);
        gain.gain.setValueAtTime(0.24 * powerRatio, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      } else {
        // Marble: Crisp mechanical snap + whoosh
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(620 * powerRatio + 140, now + 0.16);
        gain.gain.setValueAtTime(0.28 * powerRatio, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
      }

      osc.connect(gain);
      gain.connect(this.audioBus || this.masterGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch(e) {}
  }

  // Marble-on-Wood Piece Collision Clack
  playImpact(intensity = 1) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const vol = Math.min(0.55 * intensity, 0.75);
      const dest = this.audioBus || this.masterGain || this.ctx.destination;

      if (this.soundProfile === 'cyber') {
        const carrier = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(480, now);
        carrier.frequency.exponentialRampToValueAtTime(110, now + 0.18);

        mod.type = 'sawtooth';
        mod.frequency.setValueAtTime(120, now);
        modGain.gain.setValueAtTime(320 * intensity, now);
        modGain.gain.exponentialRampToValueAtTime(1, now + 0.16);

        gain.gain.setValueAtTime(vol * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        mod.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(gain);
        gain.connect(dest);

        mod.start(now);
        carrier.start(now);
        mod.stop(now + 0.22);
        carrier.stop(now + 0.22);
        return;
      }

      if (this.soundProfile === 'classic') {
        const pitchFactor = 0.94 + Math.random() * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280 * pitchFactor, now);
        osc.frequency.exponentialRampToValueAtTime(80 * pitchFactor, now + 0.08);
        gain.gain.setValueAtTime(vol * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.1);
        return;
      }

      // Marble & Walnut: Physical Piezo Transient + Dual-Resonance Ceramic Ring
      const pitchFactor = 0.93 + Math.random() * 0.14;

      // 1. Transient click (hard contact)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(3600 * pitchFactor, now);
      noiseFilter.Q.setValueAtTime(4.5, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.65, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(now);

      // 2. High-resonance marble ceramic tone (1380Hz overtone)
      const oscHigh = this.ctx.createOscillator();
      const gainHigh = this.ctx.createGain();
      oscHigh.type = 'sine';
      oscHigh.frequency.setValueAtTime(1380 * pitchFactor, now);
      oscHigh.frequency.exponentialRampToValueAtTime(950 * pitchFactor, now + 0.09);
      gainHigh.gain.setValueAtTime(vol * 0.45, now);
      gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
      oscHigh.connect(gainHigh);
      gainHigh.connect(dest);
      oscHigh.start(now);
      oscHigh.stop(now + 0.11);

      // 3. Dense hardwood/felt body thud (640Hz fundamental dropping to 90Hz)
      const oscBody = this.ctx.createOscillator();
      const gainBody = this.ctx.createGain();
      oscBody.type = 'triangle';
      oscBody.frequency.setValueAtTime(640 * pitchFactor, now);
      oscBody.frequency.exponentialRampToValueAtTime(75 * pitchFactor, now + 0.14);
      gainBody.gain.setValueAtTime(vol * 0.6, now);
      gainBody.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      oscBody.connect(gainBody);
      gainBody.connect(dest);
      oscBody.start(now);
      oscBody.stop(now + 0.17);
    } catch(e) {}
  }

  // Cushion / Perimeter Barrier Rebound Thud
  playBounce() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dest = this.audioBus || this.masterGain || this.ctx.destination;

      if (this.soundProfile === 'cyber') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.11);
        return;
      }

      // Marble & Classic: Low acoustic cushion absorption thud
      const pitchFactor = 0.95 + Math.random() * 0.10;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135 * pitchFactor, now);
      osc.frequency.exponentialRampToValueAtTime(45 * pitchFactor, now + 0.14);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      // Lowpass noise cushion puff
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(now);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch(e) {}
  }

  // Sovereign King Awakening Fanfare
  playAwakening() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dest = this.audioBus || this.masterGain || this.ctx.destination;
      const freqs = [196.00, 293.66, 392.00, 493.88];
      freqs.forEach((f, i) => {
        const startTime = now + i * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + 0.7);
      });
    } catch(e) {}
  }

  playVictory(isDraw = false) {
    if (this.muted || !this.ctx) return;
    try {
      const dest = this.audioBus || this.masterGain || this.ctx.destination;
      const notes = isDraw 
        ? [329.63, 392.00, 493.88, 587.33]
        : [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, idx) => {
        const startTime = this.ctx.currentTime + idx * (isDraw ? 0.12 : 0.09);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(isDraw ? 0.16 : 0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch(e) {}
  }

  startSuddenDeathDrone() {
    if (this.muted || !this.ctx || this.suddenDeathDrone) return;
    try {
      const now = this.ctx.currentTime;
      const dest = this.audioBus || this.masterGain || this.ctx.destination;

      // Deep oscillating sub-bass tension drone (55Hz and 110Hz harmonics)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const droneGain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, now);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110.2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);
      filter.Q.setValueAtTime(4.5, now);

      // LFO modulation of filter frequency (slow cinematic breathing)
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.4, now);
      lfoGain.gain.setValueAtTime(80, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.linearRampToValueAtTime(0.24, now + 1.8);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(dest);

      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      this.suddenDeathDrone = {
        osc1, osc2, lfo, droneGain,
        stop: () => {
          try {
            const stopTime = this.ctx.currentTime;
            droneGain.gain.linearRampToValueAtTime(0.001, stopTime + 0.6);
            setTimeout(() => {
              try { osc1.stop(); osc2.stop(); lfo.stop(); } catch(e) {}
            }, 700);
          } catch(e) {}
        }
      };
    } catch(e) {}
  }

  stopSuddenDeathDrone() {
    if (this.suddenDeathDrone) {
      this.suddenDeathDrone.stop();
      this.suddenDeathDrone = null;
    }
  }

  playShatter() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dest = this.audioBus || this.masterGain || this.ctx.destination;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
      oscGain.gain.setValueAtTime(0.45, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(oscGain);
      oscGain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.4);

      const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.2);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);
      noise.start(now);
    } catch(e) {}
  }

  playReactionChime() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dest = this.audioBus || this.masterGain || this.ctx.destination;
      const freqs = [659.25, 880.00, 1046.50];
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.04);
        gain.gain.setValueAtTime(0.2, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.25);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.28);
      });
    } catch(e) {}
  }
}

// Canonical Staunton Vector Piece Paths (viewBox 0 0 45 45, aligned with React Chess Classic)
const STAUNTON_2D_PATHS = {
  pawn: "M 22.5 9 C 19.5 9 17.5 11 17.5 14 C 17.5 16 19 17.5 20.5 18.5 C 17 21 16 26 16 31 L 29 31 C 29 26 28 21 24.5 18.5 C 26 17.5 27.5 16 27.5 14 C 27.5 11 25.5 9 22.5 9 z M 13 33 L 32 33 L 32 36 L 13 36 z",
  rook: "M 11 10 L 11 16 L 14 16 L 14 12 L 19 12 L 19 16 L 26 16 L 26 12 L 31 12 L 31 16 L 34 16 L 34 10 z M 14 18 L 31 18 L 29 29 L 16 29 z M 11 31 L 34 31 L 34 35 L 11 35 z",
  knight: "M 22 10 C 22 10 16 12 14 16 C 12 20 12 26 15 28 C 16 29 18 28 18 28 C 17 31 14 32 11 32 L 11 35 L 34 35 C 34 32 33 28 31 24 C 28 18 26 14 26 10 z M 18 16 C 18 16 19 14 20 15 C 21 16 20 18 19 18 z",
  bishop: "M 22.5 8 C 21.5 8 21 9 21 10 C 19 12 17 16 17 20 C 17 25 19 28 20.5 29 L 24.5 29 C 26 28 28 25 28 20 C 28 16 26 12 24 10 C 24 9 23.5 8 22.5 8 z M 14 31 L 31 31 L 31 35 L 14 35 z M 21.5 14 L 23.5 14 M 22.5 13 L 22.5 17",
  queen: "M 11 16 L 15 28 L 30 28 L 34 16 L 27 21 L 22.5 12 L 18 21 z M 12 30 L 33 30 L 33 34 L 12 34 z M 11 13 A 2 2 0 1 1 11 17 A 2 2 0 1 1 11 13 M 18 10 A 2 2 0 1 1 18 14 A 2 2 0 1 1 18 10 M 22.5 7 A 2 2 0 1 1 22.5 11 A 2 2 0 1 1 22.5 7 M 27 10 A 2 2 0 1 1 27 14 A 2 2 0 1 1 27 10 M 34 13 A 2 2 0 1 1 34 17 A 2 2 0 1 1 34 13",
  king: "M 22.5 6 L 22.5 11 M 20 8.5 L 25 8.5 M 22.5 11 C 18 11 15 14 15 18 C 15 22 17 25 19 27 L 26 27 C 28 25 30 22 30 18 C 30 14 27 11 22.5 11 z M 13 29 L 32 29 L 32 33 L 13 33 z"
};

// Named physics configuration for readability and tuning
const PHYSICS_CONFIG = {
  FRICTION: 0.982,
  ELASTICITY: 0.72,
  MAX_PULL_DISTANCE: 150,
  LAUNCH_IMPULSE: 0.15,
  MAX_SPEED: 13,
  MIN_MOTION_THRESHOLD: 0.15,
  BASTION_AURA_RANGE: 85,
  KNIGHT_SHOCKWAVE_RANGE: 95,
  KNIGHT_SHOCKWAVE_IMPULSE: 3.5,
  QUEEN_SUPERNOVA_THRESHOLD: 5.5,
  QUEEN_SUPERNOVA_BONUS_DAMAGE: 35,
  ROOK_SIEGE_MULTIPLIER: 2.5,
  WALL_DAMAGE_MULTIPLIER: 4.2,
  WALL_RECOIL_RATIO: 0.12,
  BASTION_DAMAGE_REDUCTION: 0.65,
  PHYSICS_HZ: 60,
  MAX_SUBSTEPS: 5
};

class ArchessArena {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.audio = new ArchessAudio();
    window.archessGame = this;

    // Mode States
    let initialMode = '3d';
    try {
      const savedView = localStorage.getItem('archess_view_mode');
      if (savedView === '2d' || savedView === '2d-arena') initialMode = '2d';
    } catch (e) {}
    this.renderMode = initialMode;
    this.boardTheme = localStorage.getItem('archess_board_theme') || 'midnight';
    this.pieceTheme = localStorage.getItem('archess_piece_theme') || 'classic';
    this.gameMode = 'bot'; // 'bot' (vs AI) or 'pvp' (local pass & play)
    this.botDifficulty = localStorage.getItem('archess_bot_difficulty') || 'commander'; // 'cadet', 'commander', 'grandmaster'
    this.currentTurn = 'white'; // 'white' or 'black'

    // Match tracking
    this.turns = 0;
    this.matchStartTime = Date.now();
    this.isGameOver = false;
    this.winner = null;
    this.botThinking = false;
    this.botTimeout = null;

    // Physics constants (from named configuration)
    this.friction = PHYSICS_CONFIG.FRICTION;
    this.elasticity = PHYSICS_CONFIG.ELASTICITY;
    this.maxPullDistance = PHYSICS_CONFIG.MAX_PULL_DISTANCE;

    // Game state
    this.pieces = [];
    this.selectedPiece = null;
    this.hoveredPiece = null;
    this.keyboardTargetIndex = 0;
    this.keyboardAimAngle = -Math.PI / 2;
    this.keyboardAimPower = 0.5;
    this.keyboardAiming = false;

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.dragScreenAnchor = { x: 0, y: 0 };
    this.dragScreenCurrent = { x: 0, y: 0 };

    this.particles = [];
    this.damageNumbers = [];
    this.shockwaves = [];
    this.screenShake = 0;
    this.simulationSettling = false;
    this.totalImpacts = 0;
    this.whiteDamage = 0;
    this.blackDamage = 0;

    // Kinetic Particle VFX Themes (v3.3.0)
    this.particleTheme = localStorage.getItem('archess_particle_theme') || 'sovereign_sparks';

    // Automated Tactical Match Commentary Stream (v3.3.0)
    this.commentaryLog = [];
    this.onCommentary = null;

    // Telemetry callback
    this.onTelemetry = null;

    // Real-Time Multiplayer State (v3.0.0)
    this.multiplayerMode = false;
    this.playerRole = null; // 'white', 'black', 'spectator'
    this.opponentAim = null;
    this.onAimUpdate = null;
    this.onAimCancel = null;
    this.onPieceLaunchBroadcast = null;

    // Realistic 3D WebGL Game Engine (Three.js)
    this.engine3d = null;
    if (window.THREE && window.Archess3DEngine) {
      const container = document.getElementById('threeCanvasContainer');
      if (container) {
        try {
          this.engine3d = new window.Archess3DEngine(this, 'threeCanvasContainer');
        } catch (err) {
          console.warn('[ArchessArena] 3D WebGL initialization notice:', err);
        }
      }
    }

    this.initCanvasSize();
    this.init32Pieces();
    this.setupListeners();
    this.lastTime = performance.now();
    this._rAFId = requestAnimationFrame(this.loop.bind(this));
    this._boundLoop = this.loop.bind(this);
    this._paused = false;

    // Pause/Resume game loop on page visibility change to save GPU
    this._visibilityHandler = () => {
      if (document.hidden) {
        this._paused = true;
        if (this._rAFId) { cancelAnimationFrame(this._rAFId); this._rAFId = null; }
      } else {
        if (this._paused) {
          this._paused = false;
          this.lastTime = performance.now();
          this._rAFId = requestAnimationFrame(this._boundLoop);
        }
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

    this.logTelemetry('SYSTEM', 'ArChess 32-Piece Physics Engine initialized. Board Mode: 3D Realistic WebGL.');
    this.logTelemetry('TURN_START', `Turn active: ${this.currentTurn.toUpperCase()} army ready.`);
    this.addCommentary('Vanguard units mobilized on tactical grid. Engagement initiated.', 'info', '⚔️');
  }

  initCanvasSize(passedOldLayout = null) {
    if (!this.canvas) return;
    const oldLayout = passedOldLayout || this.currentLayout || ((this.width && this.height) ? this.getBoardLayout() : null);
    const parent = this.canvas.parentElement;
    let pw = 0;
    let ph = 0;

    const canvasBox = document.getElementById('archess2DCanvasBox');
    const archessFrame = document.getElementById('archess2DFrame');
    const stage = document.getElementById('arenaCanvasStage');

    if (this.renderMode === '2d' && archessFrame && stage) {
      const stageRect = stage.getBoundingClientRect();
      const available = Math.min(stageRect.width || 600, stageRect.height || 600);
      const frameDim = Math.max(280, Math.min(960, available - 16));
      archessFrame.style.width = frameDim + 'px';

      // Inner square accounts for 20px padding and ~46px classic-fide-bar
      const innerSquare = Math.max(220, frameDim - 56);
      if (canvasBox) {
        canvasBox.style.width = innerSquare + 'px';
        canvasBox.style.height = innerSquare + 'px';
      }
      pw = innerSquare;
      ph = innerSquare;
    } else {
      const boardColumn = parent ? parent.closest('.arena-board-column') : null;
      if (boardColumn) {
        const colRect = boardColumn.getBoundingClientRect();
        const maxAvailable = Math.floor(Math.min(colRect.width - 56, colRect.height) - 8);
        if (maxAvailable >= 200) {
          pw = maxAvailable;
          ph = maxAvailable;
          if (parent && parent.id === 'arenaCanvasStage') {
            parent.style.width = maxAvailable + 'px';
            parent.style.height = maxAvailable + 'px';
          }
        }
      } else if (parent) {
        const rect = parent.getBoundingClientRect();
        pw = rect.width;
        ph = rect.height;
        if (!pw || pw < 50) pw = parent.clientWidth;
        if (!ph || ph < 50) ph = parent.clientHeight;
      }
      if (!pw || pw < 50) pw = window.innerWidth > 900 ? 760 : Math.max(320, window.innerWidth - 40);
      if (!ph || ph < 50) ph = pw;

      // Enforce square proportions
      const squareSize = Math.round(Math.min(pw, ph));
      pw = squareSize;
      ph = squareSize;
    }

    this.width = Math.round(pw);
    this.height = Math.round(ph);
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    if (this.ctx.resetTransform) {
      this.ctx.resetTransform();
    } else {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.scale(this.dpr, this.dpr);

    const newLayout = this.getBoardLayout();

    // Proportional coordinate scaling without resetting active game
    if (newLayout && newLayout.gridSize > 0 && this.pieces && this.pieces.length > 0) {
      const scaleRatio = (oldLayout && oldLayout.gridSize > 0) ? (newLayout.gridSize / oldLayout.gridSize) : 1;
      this.pieces.forEach(p => {
        if (!p.hasMoved && p.col !== undefined && p.row !== undefined && (!p.vx || p.vx === 0) && (!p.vy || p.vy === 0)) {
          // Stationary piece: lock exactly to square center
          p.x = newLayout.gridOriginX + p.col * newLayout.sqSize + newLayout.sqSize / 2;
          p.y = newLayout.gridOriginY + p.row * newLayout.sqSize + newLayout.sqSize / 2;
          p.originX = p.x;
          p.originY = p.y;
        } else if (oldLayout && oldLayout.gridSize > 0) {
          const relX = (p.x - oldLayout.gridOriginX) / oldLayout.gridSize;
          const relY = (p.y - oldLayout.gridOriginY) / oldLayout.gridSize;
          p.x = newLayout.gridOriginX + relX * newLayout.gridSize;
          p.y = newLayout.gridOriginY + relY * newLayout.gridSize;

          const origRelX = (p.originX - oldLayout.gridOriginX) / oldLayout.gridSize;
          const origRelY = (p.originY - oldLayout.gridOriginY) / oldLayout.gridSize;
          p.originX = newLayout.gridOriginX + origRelX * newLayout.gridSize;
          p.originY = newLayout.gridOriginY + origRelY * newLayout.gridSize;
        }

        const radiusMulti = (p.type === 'queen' || p.type === 'king') ? 0.40 : p.type === 'rook' ? 0.37 : p.type === 'knight' ? 0.36 : p.type === 'bishop' ? 0.35 : 0.32;
        p.radius = Math.max(8, Math.round(newLayout.sqSize * radiusMulti));
        if (p.wallHalf !== undefined) p.wallHalf = p.type === 'king' ? Math.round(newLayout.sqSize * 0.47) : 0;
        if (p.wallRadius !== undefined) p.wallRadius = p.type === 'king' ? Math.round(newLayout.sqSize * 0.47) : 0;
      });
    }
    this.currentLayout = newLayout;

    if (this.engine3d) {
      this.engine3d.resize(this.width, this.height);
      this.engine3d.syncPieces();
    }
  }

  spawnFloatingReaction(emoji, originX = null, originY = null, sender = null) {
    const stage = document.getElementById('floatingReactionsStage') || this.canvas?.parentElement;
    if (!stage) return;

    if (this.audio) {
      this.audio.playReactionChime();
    }

    const bubble = document.createElement('div');
    bubble.className = 'floating-reaction-bubble';

    const rect = this.canvas ? this.canvas.getBoundingClientRect() : { width: 500, height: 500 };
    const left = originX !== null ? originX : (rect.width * 0.35 + Math.random() * (rect.width * 0.3));
    const top = originY !== null ? originY : (rect.height * 0.65 + Math.random() * (rect.height * 0.15));

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;

    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = emoji || '⚔️';
    bubble.appendChild(emojiSpan);

    if (sender) {
      const senderSpan = document.createElement('span');
      senderSpan.className = 'reaction-sender';
      senderSpan.textContent = sender;
      bubble.appendChild(senderSpan);
    }

    stage.appendChild(bubble);

    this.addCommentary(`${sender || 'Commander'} signaled reaction: ${emoji}`, 'emote', emoji);

    setTimeout(() => {
      if (bubble.parentElement) bubble.parentElement.removeChild(bubble);
    }, 2200);
  }

  getBoardLayout() {
    const minDim = Math.min(this.width, this.height);
    if (this.renderMode === '2d') {
      const boardSize = minDim;
      const borderSize = 0;
      const originX = (this.width - boardSize) / 2;
      const originY = (this.height - boardSize) / 2;
      const gridOriginX = originX;
      const gridOriginY = originY;
      const gridSize = boardSize;
      const sqSize = gridSize / 8;
      return {
        boardSize,
        originX,
        originY,
        borderSize,
        gridOriginX,
        gridOriginY,
        gridSize,
        sqSize
      };
    }
    const boardSize = Math.max(300, minDim - 36);
    const originX = (this.width - boardSize) / 2;
    const originY = (this.height - boardSize) / 2;
    const borderSize = Math.max(24, Math.round(boardSize * 0.052));
    const gridOriginX = originX + borderSize;
    const gridOriginY = originY + borderSize;
    const gridSize = boardSize - borderSize * 2;
    const sqSize = gridSize / 8;

    return {
      boardSize,
      originX,
      originY,
      borderSize,
      gridOriginX,
      gridOriginY,
      gridSize,
      sqSize
    };
  }

  getMaterialDiff() {
    const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
    let whiteMat = 0;
    let blackMat = 0;
    this.pieces.forEach(p => {
      if (!p.dead) {
        if (p.team === 'white') whiteMat += (values[p.type] || 0);
        else blackMat += (values[p.type] || 0);
      }
    });
    return whiteMat - blackMat;
  }

  logTelemetry(type, message) {
    if (!this.matchEvents) this.matchEvents = [];
    const milestoneTypes = ['LAUNCH', 'FORTRESS_WALL_HIT', 'FORTRESS_BREACH', 'SUPERNOVA', 'SOVEREIGN_STRIKE', 'SHOCKWAVE', 'ELIMINATION', 'SUDDEN_DEATH', 'SOVEREIGN_AWAKENED', 'VICTORY', 'STALEMATE'];
    if (milestoneTypes.includes(type)) {
      this.matchEvents.push({
        turn: this.turns || 1,
        type: type,
        message: message,
        timeSec: Math.max(0, Math.round((Date.now() - (this.matchStartTime || Date.now())) / 1000))
      });
    }
    if (this.onTelemetry) {
      this.onTelemetry({
        type: type,
        message: message,
        time: new Date().toLocaleTimeString()
      });
    }
  }

  /**
   * Spawns canonical 32 chess pieces on standard 8x8 coordinates
   */
  init32Pieces() {
    this.pieces = [];
    this.capturedPieces = { white: [], black: [] };
    const layout = this.getBoardLayout();
    this.currentLayout = layout;
    const sqSize = layout.sqSize;

    const backRankOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    const glyphs = {
      white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };

    const pieceArchetypes = {
      pawn:   { mass: 1.0, speed: 0.72, bounce: 0.65, hp: 50,  radius: Math.round(sqSize * 0.32) },
      knight: { mass: 1.4, speed: 0.86, bounce: 0.85, hp: 80,  radius: Math.round(sqSize * 0.36) },
      bishop: { mass: 1.1, speed: 0.88, bounce: 0.88, hp: 70,  radius: Math.round(sqSize * 0.35) },
      rook:   { mass: 2.8, speed: 0.65, bounce: 0.48, hp: 110, radius: Math.round(sqSize * 0.37) },
      queen:  { mass: 1.9, speed: 0.94, bounce: 0.75, hp: 130, radius: Math.round(sqSize * 0.40) },
      king:   { mass: 6.0, speed: 0.0,  bounce: 0.38, hp: 600, radius: Math.round(sqSize * 0.40) }
    };

    // Helper to spawn a piece
    const spawnPiece = (team, type, col, row, id) => {
      const arch = pieceArchetypes[type];
      const x = layout.gridOriginX + col * sqSize + sqSize / 2;
      const y = layout.gridOriginY + row * sqSize + sqSize / 2;
      const isKing = type === 'king';

      this.pieces.push({
        id: id,
        team: team,
        type: type,
        col: col,
        row: row,
        hasMoved: false,
        x: x,
        y: y,
        originX: x,
        originY: y,
        vx: 0,
        vy: 0,
        radius: arch.radius,
        mass: arch.mass,
        bounce: arch.bounce,
        speedMulti: arch.speed,
        glyph: glyphs[team][type],
        hp: arch.hp,
        maxHp: arch.hp,
        dead: false,
        hitFlash: 0,
        immovable: isKing,
        awakened: false,
        // King Fortress Square Wall properties (Fits chess square)
        wallActive: isKing,
        wallHp: isKing ? 280 : 0,
        maxWallHp: isKing ? 280 : 0,
        wallHalf: isKing ? Math.round(sqSize * 0.47) : 0,
        wallRadius: isKing ? Math.round(sqSize * 0.47) : 0,
        wallHitFlash: 0
      });
    };

    // Black Army (Rows 0 and 1)
    backRankOrder.forEach((type, col) => {
      spawnPiece('black', type, col, 0, `black_${type}_${col}`);
    });
    for (let col = 0; col < 8; col++) {
      spawnPiece('black', 'pawn', col, 1, `black_pawn_${col}`);
    }

    // White Army (Rows 7 and 6)
    for (let col = 0; col < 8; col++) {
      spawnPiece('white', 'pawn', col, 6, `white_pawn_${col}`);
    }
    backRankOrder.forEach((type, col) => {
      spawnPiece('white', type, col, 7, `white_${type}_${col}`);
    });

    this.updateHUD();
    if (this.engine3d) {
      this.engine3d.syncPieces();
    }
  }

  setRenderMode(mode) {
    if (this.renderMode === mode) return;
    const oldLayout = this.currentLayout || this.getBoardLayout();
    this.renderMode = mode;
    const threeContainer = document.getElementById('threeCanvasContainer');
    const archess2DContainer = document.getElementById('archess2DContainer');
    if (mode === '3d' && this.engine3d && threeContainer) {
      threeContainer.style.display = 'block';
      if (archess2DContainer) archess2DContainer.style.display = 'none';
      if (this.canvas) this.canvas.style.display = 'none';
    } else if (mode === '2d') {
      if (threeContainer) threeContainer.style.display = 'none';
      if (archess2DContainer) archess2DContainer.style.display = 'flex';
      if (this.canvas) this.canvas.style.display = 'block';
    } else if (threeContainer) {
      threeContainer.style.display = 'none';
      if (this.canvas) this.canvas.style.display = 'block';
    }
    this.initCanvasSize(oldLayout);
    this.logTelemetry('MODE_CHANGE', `Renderer set to ${mode.toUpperCase()} view.`);
  }

  setBoardTheme(theme) {
    this.boardTheme = theme;
    localStorage.setItem('archess_board_theme', theme);
    if (this.engine3d && typeof this.engine3d.setBoardTheme === 'function') {
      this.engine3d.setBoardTheme(theme);
    }
    this.logTelemetry('THEME_CHANGE', `Board palette updated to ${theme.toUpperCase()}.`);
  }

  setPieceTheme(theme) {
    this.pieceTheme = theme;
    localStorage.setItem('archess_piece_theme', theme);
    this.logTelemetry('THEME_CHANGE', `Piece style updated to ${theme.toUpperCase()}.`);
  }

  setGameMode(mode) {
    this.gameMode = mode;
    this.logTelemetry('MODE_CHANGE', `Match Mode set to: ${mode === 'bot' ? 'SOLO VS BOT AI' : 'LOCAL PASS & PLAY'}`);
    if (this.currentTurn === 'black' && this.gameMode === 'bot' && !this.isGameOver) {
      this.triggerBotTurn();
    }
  }

  setBotDifficulty(level) {
    if (!['cadet', 'commander', 'grandmaster'].includes(level)) return;
    this.botDifficulty = level;
    localStorage.setItem('archess_bot_difficulty', level);
    this.logTelemetry('AI_TIER_CHANGE', `Bot Tactical AI set to: ${level.toUpperCase()}`);
  }

  /* -------------------------------------------------------------
     Real-Time Multiplayer Engine Methods (v3.0.0)
  ------------------------------------------------------------- */
  setMultiplayerState(active, role) {
    this.multiplayerMode = Boolean(active);
    this.playerRole = role || null;
    this.logTelemetry('MP_STATE', `Multiplayer mode: ${active ? 'ACTIVE' : 'INACTIVE'} (Role: ${role || 'SOLO'})`);
  }

  setOpponentAim(aimData) {
    this.opponentAim = aimData;
  }

  clearOpponentAim() {
    this.opponentAim = null;
  }

  executeRemoteLaunch(pieceId, vx, vy, dist) {
    const piece = this.pieces.find(p => p.id === pieceId && !p.dead);
    if (!piece) return;
    this.launchPiece(piece, vx, vy, dist || 60);
    this.clearOpponentAim();
  }

  triggerBotTurn() {
    if (this.gameMode !== 'bot' || this.currentTurn !== 'black' || this.isGameOver || this.botThinking) return;

    this.botThinking = true;
    const diff = this.botDifficulty || 'commander';
    this.logTelemetry('BOT_THINKING', `ArChess Bot [${diff.toUpperCase()}] calculating tactical trajectory...`);

    const delay = diff === 'grandmaster' ? 450 : (diff === 'cadet' ? 950 : 700);
    clearTimeout(this.botTimeout);
    this.botTimeout = setTimeout(() => {
      this.executeBotTurn();
    }, delay);
  }

  executeBotTurn() {
    this.botThinking = false;
    if (this.currentTurn !== 'black' || this.isGameOver) return;

    const blackPieces = this.pieces.filter(p => !p.dead && p.team === 'black' && (p.type !== 'king' || p.awakened));
    const whitePieces = this.pieces.filter(p => !p.dead && p.team === 'white');

    if (blackPieces.length === 0 || whitePieces.length === 0) return;

    const diff = this.botDifficulty || 'commander';
    const targetWeights = { king: 220, queen: 110, rook: 70, bishop: 60, knight: 55, pawn: 25 };

    let shooter = null;
    let target = null;
    let aimAngle = 0;
    let desiredPower = 0.75;
    let trajectoryMode = 'DIRECT';

    if (diff === 'cadet') {
      // Cadet: casual aim with wide tolerance and randomized piece choice
      shooter = blackPieces[Math.floor(Math.random() * blackPieces.length)];
      target = whitePieces[Math.floor(Math.random() * whitePieces.length)];
      const dx = target.x - shooter.x;
      const dy = target.y - shooter.y;
      aimAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.28;
      desiredPower = 0.42 + Math.random() * 0.28;
    } else if (diff === 'commander') {
      // Commander: standard prioritized tactical direct fire
      const offensiveShooters = blackPieces.filter(p => ['queen', 'knight', 'bishop', 'rook', 'king'].includes(p.type));
      const candidateShooters = offensiveShooters.length > 0 ? offensiveShooters : blackPieces;

      let candidatePairs = [];
      candidateShooters.forEach(s => {
        whitePieces.forEach(t => {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const d = Math.hypot(dx, dy);
          const score = (targetWeights[t.type] || 25) / (d + 60);
          candidatePairs.push({ shooter: s, target: t, d, score, dx, dy });
        });
      });

      candidatePairs.sort((a, b) => b.score - a.score);
      const chosen = candidatePairs[0] || { shooter: blackPieces[0], target: whitePieces[0], dx: 0, dy: 1, d: 100 };
      shooter = chosen.shooter;
      target = chosen.target;

      const dx = target.x - shooter.x;
      const dy = target.y - shooter.y;
      aimAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.06;
      desiredPower = Math.min(0.96, Math.max(0.52, chosen.d / (this.width * 0.7)));
    } else {
      // Grandmaster: Neural Evaluator with Line-Of-Sight raycasting and Cushion Bank-Shots
      const layout = this.getBoardLayout();
      const wallMinX = layout.gridOriginX;
      const wallMaxX = layout.gridOriginX + layout.gridSize;

      let candidateMoves = [];
      blackPieces.forEach(s => {
        whitePieces.forEach(t => {
          const directDx = t.x - s.x;
          const directDy = t.y - s.y;
          const directDist = Math.hypot(directDx, directDy);

          // Raycast check for obstacles between s and t
          let isDirectBlocked = false;
          for (let p of this.pieces) {
            if (p === s || p === t || p.dead) continue;
            const vX = directDx / directDist;
            const vY = directDy / directDist;
            const proj = (p.x - s.x) * vX + (p.y - s.y) * vY;
            if (proj > s.radius && proj < directDist - t.radius) {
              const perpDist = Math.abs((p.x - s.x) * -vY + (p.y - s.y) * vX);
              if (perpDist < (s.radius + p.radius) * 0.95) {
                isDirectBlocked = true;
                break;
              }
            }
          }

          const baseScore = (targetWeights[t.type] || 30) * 1.5 - directDist * 0.12;

          if (!isDirectBlocked) {
            candidateMoves.push({
              shooter: s,
              target: t,
              angle: Math.atan2(directDy, directDx),
              power: Math.min(1.0, Math.max(0.72, (directDist / (this.width * 0.6)) * 1.1)),
              score: baseScore + 50,
              mode: 'DIRECT'
            });
          } else {
            // Calculate bank-shot cushion rebounds off left & right walls
            const mirrorLeftX = 2 * wallMinX - t.x;
            const bankAngleLeft = Math.atan2(t.y - s.y, mirrorLeftX - s.x);
            const tWall = (wallMinX - s.x) / Math.cos(bankAngleLeft);
            if (tWall > 0) {
              candidateMoves.push({
                shooter: s,
                target: t,
                angle: bankAngleLeft,
                power: 0.92,
                score: baseScore + 25,
                mode: 'BANK_SHOT_LEFT'
              });
            }

            const mirrorRightX = 2 * wallMaxX - t.x;
            const bankAngleRight = Math.atan2(t.y - s.y, mirrorRightX - s.x);
            const tWallR = (wallMaxX - s.x) / Math.cos(bankAngleRight);
            if (tWallR > 0) {
              candidateMoves.push({
                shooter: s,
                target: t,
                angle: bankAngleRight,
                power: 0.92,
                score: baseScore + 25,
                mode: 'BANK_SHOT_RIGHT'
              });
            }
          }
        });
      });

      candidateMoves.sort((a, b) => b.score - a.score);
      const best = candidateMoves[0] || {
        shooter: blackPieces[0],
        target: whitePieces[0],
        angle: Math.atan2(whitePieces[0].y - blackPieces[0].y, whitePieces[0].x - blackPieces[0].x),
        power: 0.85,
        mode: 'DIRECT'
      };

      shooter = best.shooter;
      target = best.target;
      aimAngle = best.angle;
      desiredPower = best.power;
      trajectoryMode = best.mode;
    }

    this.logTelemetry('BOT_AIM', `[AI Tier: ${diff.toUpperCase()}] Aiming ${shooter.type.toUpperCase()} -> ${target.type.toUpperCase()} (${trajectoryMode}, ${Math.round(desiredPower * 100)}% power)`);

    const pullDist = desiredPower * this.maxPullDistance;
    const pullX = Math.cos(aimAngle) * pullDist;
    const pullY = Math.sin(aimAngle) * pullDist;

    this.selectedPiece = shooter;
    this.keyboardAiming = true;
    this.keyboardAimAngle = aimAngle;
    this.keyboardAimPower = desiredPower;

    clearTimeout(this.botAimTimeout);
    this.botAimTimeout = setTimeout(() => {
      if (this.currentTurn === 'black' && !this.isGameOver) {
        this.launchPiece(shooter, pullX, pullY, pullDist);
      }
      this.keyboardAiming = false;
      this.selectedPiece = null;
    }, 450);
  }

  handleKingElimination(king) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.winner = king.team === 'white' ? 'black' : 'white';

    this.audio.stopSuddenDeathDrone();
    this.audio.playVictory();
    this.logTelemetry('VICTORY', `CHECKMATE! ${this.winner.toUpperCase()} ARMY WINS THE MATCH!`);
    this.addCommentary(`🏆 CHECKMATE ANNIHILATION! ${this.winner.toUpperCase()} Sovereign triumphs in Turn ${this.turns}!`, 'victory', '👑');

    const durationSec = Math.max(1, Math.round((Date.now() - this.matchStartTime) / 1000));
    const whiteUser = (window.ArchessAuth && window.ArchessAuth.currentUser) ? window.ArchessAuth.currentUser.username : 'Player1';
    const blackUser = this.opponentName || (this.gameMode === 'bot' ? 'ArChess Bot' : 'Player2');

    const payload = {
      white_username: whiteUser,
      black_username: blackUser,
      winner: this.winner,
      white_damage: this.whiteDamage,
      black_damage: this.blackDamage,
      turns: this.turns,
      duration_sec: durationSec
    };

    fetch('/api/matches/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
      this.showVictoryModal(this.winner, payload, data.settlement, data.newly_unlocked_achievements || []);
    })
    .catch(() => {
      this.showVictoryModal(this.winner, payload, null, []);
    });

    // Telemetry event
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'MATCH_COMPLETED',
        payload: payload
      })
    }).catch(() => {});
  }

  handleDraw(reason = 'INSUFFICIENT_MATERIAL') {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.winner = 'draw';

    this.audio.stopSuddenDeathDrone();
    this.audio.playVictory();
    this.logTelemetry('STALEMATE', `MATCH DRAWN — Insufficient kinetic material! Both Citadel Kings endure with no remaining vanguard pieces.`);

    const durationSec = Math.max(1, Math.round((Date.now() - this.matchStartTime) / 1000));
    const whiteUser = (window.ArchessAuth && window.ArchessAuth.currentUser) ? window.ArchessAuth.currentUser.username : 'Player1';
    const blackUser = this.opponentName || (this.gameMode === 'bot' ? 'ArChess Bot' : 'Player2');

    const payload = {
      white_username: whiteUser,
      black_username: blackUser,
      winner: 'draw',
      white_damage: this.whiteDamage,
      black_damage: this.blackDamage,
      turns: this.turns,
      duration_sec: durationSec
    };

    fetch('/api/matches/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
      this.showVictoryModal('draw', payload, data.settlement, data.newly_unlocked_achievements || []);
    })
    .catch(() => {
      this.showVictoryModal('draw', payload, null, []);
    });

    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'MATCH_DRAWN',
        payload: payload
      })
    }).catch(() => {});
  }

  getMatchMVP(winningTeam) {
    const candidatePieces = this.pieces.filter(p => winningTeam === 'draw' || p.team === winningTeam);
    let bestPiece = candidatePieces[0] || this.pieces[0];
    let bestScore = -1;

    candidatePieces.forEach(p => {
      const pKey = p.id || `${p.team}_${p.type}`;
      const dmg = (this.pieceDamageDealt && this.pieceDamageDealt[pKey]) || 0;
      const kills = (this.pieceKills && this.pieceKills[pKey]) || 0;
      const score = dmg + kills * 75;
      if (score > bestScore) {
        bestScore = score;
        bestPiece = p;
      }
    });

    const archetypes = {
      queen: { name: 'The Queen', desc: 'Dominated the kinetic field and shattered enemy lines with high-velocity shockwaves.' },
      rook: { name: 'The Rook', desc: 'Bulldozed defensive phalanxes as an unstoppable fortified colossus.' },
      bishop: { name: 'The Bishop', desc: 'Executed lethal diagonal rebounds, sniping critical targets across the perimeter.' },
      knight: { name: 'The Knight', desc: 'Emitted concussive kinetic shockwaves, destabilizing enemy formations.' },
      pawn: { name: 'The Pawn', desc: 'Bravely held the front rank phalanx and absorbed heavy recoil force.' },
      king: { name: 'The King Citadel', desc: 'Endured the hostile siege and defended the realm from total collapse.' }
    };

    const info = (bestPiece && archetypes[bestPiece.type]) || archetypes.queen;
    const bKey = bestPiece ? (bestPiece.id || `${bestPiece.team}_${bestPiece.type}`) : '';
    return {
      type: bestPiece ? bestPiece.type : 'queen',
      team: bestPiece ? bestPiece.team : (winningTeam === 'draw' ? 'white' : winningTeam),
      glyph: bestPiece ? bestPiece.glyph : '♛',
      name: `${bestPiece && bestPiece.team === 'white' ? 'White' : 'Black'} ${info.name}`,
      damage: (this.pieceDamageDealt && this.pieceDamageDealt[bKey]) || (bestScore > 0 ? bestScore : 180),
      kills: (this.pieceKills && this.pieceKills[bKey]) || 1,
      desc: info.desc
    };
  }

  showVictoryModal(winner, payload, settlement, newlyUnlocked = []) {
    if (settlement && settlement.match_id) {
      window.lastSettledMatchId = settlement.match_id;
    }
    const modal = document.getElementById('victoryModal');
    if (!modal) return;

    // Newly Unlocked Career Achievements Banner (v3.2.0)
    const achWrap = document.getElementById('victoryAchievementsWrap');
    const achList = document.getElementById('victoryBadgesList');
    if (achWrap && achList) {
      if (newlyUnlocked && newlyUnlocked.length > 0) {
        achWrap.style.display = 'block';
        achList.innerHTML = '';
        newlyUnlocked.forEach(a => {
          const card = document.createElement('div');
          card.className = 'victory-badge-card';

          const iconSpan = document.createElement('span');
          iconSpan.className = 'badge-icon';
          iconSpan.textContent = a.icon || '🎖️';

          const infoDiv = document.createElement('div');

          const nameDiv = document.createElement('div');
          nameDiv.className = 'badge-name';
          nameDiv.textContent = a.title + ' \u2022 ';
          const tierSpan = document.createElement('span');
          tierSpan.style.cssText = 'font-size: 0.72rem; color: var(--gold-bright); text-transform: uppercase;';
          tierSpan.textContent = (a.tier || '') + ' Tier';
          nameDiv.appendChild(tierSpan);

          const descDiv = document.createElement('div');
          descDiv.className = 'badge-desc';
          descDiv.textContent = a.description || '';

          infoDiv.appendChild(nameDiv);
          infoDiv.appendChild(descDiv);
          card.appendChild(iconSpan);
          card.appendChild(infoDiv);
          achList.appendChild(card);
        });

        newlyUnlocked.forEach((a, idx) => {
          setTimeout(() => {
            window.ArchessToast?.show(`🎖️ Career Badge Unlocked: ${a.title}`, 'success', 4500, 'ACHIEVEMENT');
          }, 800 + idx * 600);
        });
      } else {
        achWrap.style.display = 'none';
        achList.innerHTML = '';
      }
    }

    const badge = document.getElementById('victoryBadge');
    const title = document.getElementById('victoryTitle');
    const sub = document.getElementById('victorySub');
    const statTurns = document.getElementById('statTurns');
    const statDuration = document.getElementById('statDuration');
    const statEloChange = document.getElementById('statEloChange');

    const isDraw = winner === 'draw';
    const isWhiteWin = winner === 'white';
    if (badge) {
      badge.className = `victory-banner-badge ${isDraw ? 'draw' : (isWhiteWin ? 'white-win' : 'black-win')}`;
      badge.textContent = isDraw ? 'MATCH DRAWN — STALEMATE' : `${winner.toUpperCase()} ARMY VICTORIOUS`;
    }
    if (title) {
      title.textContent = isDraw
        ? 'STALEMATE — DEADLOCK OF CITADELS'
        : (isWhiteWin ? 'CHECKMATE — GLORY TO WHITE' : 'CHECKMATE — BLACK SUPREMACY');
    }
    if (sub) {
      sub.textContent = isDraw
        ? `All vanguard pieces shattered. Both Kings stand impregnable in turn ${payload.turns}. Official draw recorded.`
        : `The enemy King was shattered in turn ${payload.turns}. Match settled on the Grandmaster ladder.`;
    }
    if (statTurns) statTurns.textContent = payload.turns;
    if (statDuration) statDuration.textContent = `${payload.duration_sec}s`;

    // 1. Post-Match MVP Spotlight Card
    const mvp = this.getMatchMVP(winner);
    const mvpTeamTag = document.getElementById('mvpTeamTag');
    const mvpDisc = document.getElementById('mvpDisc');
    const mvpName = document.getElementById('mvpName');
    const mvpDamage = document.getElementById('mvpDamage');
    const mvpKills = document.getElementById('mvpKills');
    const mvpDesc = document.getElementById('mvpDesc');

    if (mvpTeamTag) mvpTeamTag.textContent = `${mvp.team.toUpperCase()} ARMY`;
    if (mvpDisc) mvpDisc.textContent = mvp.glyph;
    if (mvpName) mvpName.textContent = mvp.name;
    if (mvpDamage) mvpDamage.textContent = `${mvp.damage} Kinetic Damage`;
    if (mvpKills) mvpKills.textContent = `${mvp.kills} Eliminations`;
    if (mvpDesc) mvpDesc.textContent = mvp.desc;

    // 2. Kinetic Battle Force Output (White vs Black)
    const totalDmg = (payload.white_damage || 0) + (payload.black_damage || 0);
    const whiteRatio = totalDmg > 0 ? Math.round(((payload.white_damage || 0) / totalDmg) * 100) : 50;
    const blackRatio = 100 - whiteRatio;

    const damageRatioLabel = document.getElementById('damageRatioLabel');
    const damageWhiteBar = document.getElementById('damageWhiteBar');
    const damageBlackBar = document.getElementById('damageBlackBar');
    const whiteTotalLabel = document.getElementById('whiteTotalDamageLabel');
    const blackTotalLabel = document.getElementById('blackTotalDamageLabel');

    if (damageRatioLabel) damageRatioLabel.textContent = `White ${whiteRatio}% vs ${blackRatio}% Black`;
    if (damageWhiteBar) damageWhiteBar.style.width = `${whiteRatio}%`;
    if (damageBlackBar) damageBlackBar.style.width = `${blackRatio}%`;
    if (whiteTotalLabel) whiteTotalLabel.textContent = `White: ${payload.white_damage || 0} DMG`;
    if (blackTotalLabel) blackTotalLabel.textContent = `Black: ${payload.black_damage || 0} DMG`;

    // 3. Rolling Animated ELO Odometer Counter
    if (statEloChange) {
      const targetDelta = settlement 
        ? (isDraw ? 0 : (isWhiteWin ? settlement.white_delta : settlement.black_delta))
        : (isDraw ? 0 : (isWhiteWin ? 18 : -18));
      
      let currentVal = 0;
      const step = targetDelta > 0 ? 1 : -1;
      statEloChange.textContent = '+0 ELO';
      if (targetDelta === 0) {
        statEloChange.textContent = '+0 ELO';
      } else {
        const timer = setInterval(() => {
          currentVal += step;
          statEloChange.textContent = currentVal >= 0 ? `+${currentVal} ELO` : `${currentVal} ELO`;
          if (currentVal === targetDelta) {
            clearInterval(timer);
          }
        }, 25);
      }
    }

    // 4. Render Tactical Combat Timeline
    const timelineList = document.getElementById('timelineEventsList');
    if (timelineList && this.matchEvents) {
      if (this.matchEvents.length === 0) {
        timelineList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 10px;">No critical tactical events recorded.</div>';
      } else {
        timelineList.innerHTML = this.matchEvents.slice(-15).map(evt => {
          let badgeCls = 'badge-cyan';
          if (evt.type === 'ELIMINATION') badgeCls = 'badge-red';
          else if (evt.type.includes('BREACH') || evt.type.includes('WALL')) badgeCls = 'badge-orange';
          else if (evt.type.includes('SOVEREIGN') || evt.type.includes('SUPERNOVA')) badgeCls = 'badge-gold';
          else if (evt.type === 'VICTORY') badgeCls = 'badge-green';
          else if (evt.type === 'STALEMATE') badgeCls = 'badge-amber';

          return `
            <div class="timeline-event-item">
              <span class="timeline-event-time">${evt.timeSec}s</span>
              <span class="timeline-event-turn">T${evt.turn}</span>
              <span class="timeline-event-badge ${badgeCls}">${evt.type}</span>
              <span class="timeline-event-desc">${evt.message}</span>
            </div>
          `;
        }).join('');
      }
    }

    setTimeout(() => {
      modal.classList.add('active');
    }, 1200);
  }

  resetBoard() {
    this.init32Pieces();
    this.capturedPieces = { white: [], black: [] };
    this.particles = [];
    this.damageNumbers = [];
    this.shockwaves = [];
    this.matchEvents = [];
    this.currentTurn = 'white';
    this.selectedPiece = null;
    this.whiteDamage = 0;
    this.blackDamage = 0;
    this.turns = 0;
    this.matchStartTime = Date.now();
    this.isGameOver = false;
    this.winner = null;
    this.simulationSettling = false;
    this.turnStartTime = performance.now();
    this.suddenDeathMode = false;
    this.audio.stopSuddenDeathDrone();
    this.pieceDamageDealt = {};
    this.pieceKills = {};
    const timerRing = document.getElementById('turnTimerRing');
    if (timerRing) {
      timerRing.style.strokeDashoffset = '0px';
      timerRing.setAttribute('class', 'turn-timer-circle');
    }
    clearTimeout(this.botTimeout);
    clearTimeout(this.botAimTimeout);
    this.botTimeout = null;
    this.botAimTimeout = null;
    this.botThinking = false;
    this.keyboardAiming = false;
    this.updateHUD();
    if (this.onResetArena) {
      this.onResetArena();
    }
    this.logTelemetry('RESET', 'Board reset to standard 32-piece tournament arrangement.');
    this.addCommentary('Combat arena re-racked. All 32 units restored to opening arrangement.', 'info', '🔄');
  }

  /* -------------------------------------------------------------
     Coordinate Mapping (2D vs 3D Isometric Projection)
  ------------------------------------------------------------- */
  toScreen(x, y, elevation = 0) {
    if (this.renderMode === '2d') {
      return { x: x, y: y - elevation };
    }

    const layout = this.getBoardLayout();
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    const nx = (x - centerX) / (layout.boardSize / 2);
    const ny = (y - centerY) / (layout.boardSize / 2);

    const pitch = 0.68;
    const scale = 0.86;
    const depth = 1 + ny * 0.18;

    const sx = centerX + nx * (layout.boardSize / 2) * scale * depth;
    const sy = centerY + ny * (layout.boardSize / 2) * scale * pitch + 16 - elevation * depth;

    return { x: sx, y: sy };
  }

  fromScreen(sx, sy) {
    if (this.renderMode === '2d') {
      return { x: sx, y: sy };
    }

    const layout = this.getBoardLayout();
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const pitch = 0.68;
    const scale = 0.86;

    const ny = (sy - 16 - centerY) / ((layout.boardSize / 2) * scale * pitch);
    const depth = 1 + ny * 0.18;
    const nx = (sx - centerX) / ((layout.boardSize / 2) * scale * (depth || 1));

    const bx = centerX + nx * (layout.boardSize / 2);
    const by = centerY + ny * (layout.boardSize / 2);
    return { x: bx, y: by };
  }

  /* -------------------------------------------------------------
     User Interaction Listeners (Mouse, Touch, Keyboard)
  ------------------------------------------------------------- */
  setupListeners() {
    window.addEventListener('resize', () => {
      this.initCanvasSize();
    });

    if (window.ResizeObserver && this.canvas && this.canvas.parentElement) {
      try {
        const boardColumn = this.canvas.parentElement.closest('.arena-board-column');
        this.resizeObserver = new ResizeObserver(() => {
          this.initCanvasSize();
        });
        if (boardColumn) {
          this.resizeObserver.observe(boardColumn);
        } else {
          this.resizeObserver.observe(this.canvas.parentElement);
        }
      } catch (e) {}
    }

    const getPointerScreenPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
      const scaleX = this.width / (rect.width || 1);
      const scaleY = this.height / (rect.height || 1);
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const handlePointerDown = (e) => {
      if (this.isGameOver) return;
      if (this.gameMode === 'bot' && this.currentTurn === 'black') return;
      if (this.multiplayerMode) {
        if (this.playerRole === 'spectator') return;
        if (this.playerRole && this.playerRole !== this.currentTurn) {
          window.ArchessToast?.show("Waiting for opponent's turn", 'warning', 1800, 'MULTIPLAYER');
          return;
        }
      }
      this.audio.init();

      const screenPos = getPointerScreenPos(e);

      // Check if clicking King of current turn: show stationary citadel feedback ONLY if King is still anchored
      const currentKing = this.pieces.find(p => !p.dead && p.team === this.currentTurn && p.type === 'king');
      if (currentKing && !currentKing.awakened) {
        const kElevation = (this.renderMode === '3d') ? 14 : 0;
        const kScreen = this.toScreen(currentKing.x, currentKing.y, kElevation);
        const kHitCenterY = this.renderMode === '3d' ? (kScreen.y - currentKing.radius * 0.3) : kScreen.y;
        const kDist = Math.hypot(screenPos.x - kScreen.x, screenPos.y - kHitCenterY);
        const kHitRadius = currentKing.radius * (this.renderMode === '3d' ? 2.2 : 1.8);
        if (kDist <= kHitRadius) {
          this.logTelemetry('CITADEL_STATIONARY', `The King is anchored as Citadel until vanguard falls. Sling vanguard pieces.`);
          this.addDamageNumber(currentKing.x, currentKing.y - currentKing.radius * 1.5, 0, false, '#ffd700', 'ANCHORED CITADEL');
        }
      }

      // Check if clicking an eligible piece on current turn (Awakened King is eligible!)
      const eligiblePieces = this.pieces.filter(p => !p.dead && p.team === this.currentTurn && (p.type !== 'king' || p.awakened));
      let target = null;
      let bestDist = Infinity;

      for (const p of eligiblePieces) {
        const pElevation = (this.renderMode === '3d') ? 14 : 0;
        const pScreen = this.toScreen(p.x, p.y, pElevation);
        const hitCenterY = this.renderMode === '3d' ? (pScreen.y - p.radius * 0.3) : pScreen.y;
        const dist = Math.hypot(screenPos.x - pScreen.x, screenPos.y - hitCenterY);
        const hitRadius = p.radius * (this.renderMode === '3d' ? 1.85 : 1.5);

        if (dist <= hitRadius && dist < bestDist) {
          bestDist = dist;
          target = p;
        }
      }

      if (target) {
        this.selectedPiece = target;
        this.isDragging = true;
        const pElevation = (this.renderMode === '3d') ? 26 : 0;
        const pScreen = this.toScreen(target.x, target.y, pElevation);
        this.dragScreenAnchor = { x: pScreen.x, y: pScreen.y };
        this.dragScreenCurrent = { x: screenPos.x, y: screenPos.y };
        this.dragStart = { x: target.x, y: target.y };
        this.dragCurrent = { x: target.x, y: target.y };
        this.logTelemetry('PIECE_SELECTED', `Selected ${target.team.toUpperCase()} ${target.type.toUpperCase()} at [${Math.round(target.x)}, ${Math.round(target.y)}]`);
        if (e.cancelable) e.preventDefault();
      }
    };

    let lastTensionSoundTime = 0;
    const handlePointerMove = (e) => {
      if (this.renderMode === '3d') return; // Handled exclusively by engine3d in 3D mode
      const screenPos = getPointerScreenPos(e);
      if (this.isDragging && this.selectedPiece) {
        this.dragScreenCurrent = screenPos;
        const pullScreenX = this.dragScreenAnchor.x - this.dragScreenCurrent.x;
        const pullScreenY = this.dragScreenAnchor.y - this.dragScreenCurrent.y;
        const screenDist = Math.hypot(pullScreenX, pullScreenY);
        const powerRatio = Math.min(screenDist, this.maxPullDistance) / this.maxPullDistance;
        const now = performance.now();
        if (now - lastTensionSoundTime > 90) {
          this.audio.playTension(powerRatio);
          lastTensionSoundTime = now;
        }
        if (this.multiplayerMode && typeof this.onAimUpdate === 'function') {
          if (!this._lastAimEmit || now - this._lastAimEmit > 33) {
            this._lastAimEmit = now;
            this.onAimUpdate({
              pieceId: this.selectedPiece.id,
              pullScreenX,
              pullScreenY,
              powerRatio
            });
          }
        }
        if (e.cancelable) e.preventDefault();
      } else {
        // Track hovered piece so HP is only shown on hover!
        let hovered = null;
        for (const p of this.pieces) {
          if (p.dead) continue;
          const pElevation = (this.renderMode === '3d') ? 14 : 0;
          const pScreen = this.toScreen(p.x, p.y, pElevation);
          const hitCenterY = this.renderMode === '3d' ? (pScreen.y - p.radius * 0.3) : pScreen.y;
          const dist = Math.hypot(screenPos.x - pScreen.x, screenPos.y - hitCenterY);
          if (dist <= p.radius * 1.5) {
            hovered = p;
            break;
          }
        }
        this.hoveredPiece = hovered;
      }
    };

    const handlePointerUp = () => {
      if (this.renderMode === '3d') return; // Handled exclusively by engine3d in 3D mode
      if (!this.isDragging || !this.selectedPiece) return;
      this.isDragging = false;

      const pullScreenX = this.dragScreenAnchor.x - this.dragScreenCurrent.x;
      const pullScreenY = this.dragScreenAnchor.y - this.dragScreenCurrent.y;
      const screenDist = Math.hypot(pullScreenX, pullScreenY);

      if (screenDist > 14) {
        const clampedDist = Math.min(screenDist, this.maxPullDistance);
        const powerRatio = clampedDist / this.maxPullDistance;
        let launchVx = pullScreenX;
        let launchVy = pullScreenY;

        if (this.renderMode === '2d') {
          this.launchPiece(this.selectedPiece, pullScreenX, pullScreenY, clampedDist);
        } else {
          // In 3D: Convert screen pull vector into board space isotropically
          const layout = this.getBoardLayout();
          const centerY = this.height / 2;
          const ny = (this.selectedPiece.y - centerY) / (layout.boardSize / 2);
          const depth = 1 + ny * 0.18;
          const pitch = 0.68;
          const scale = 0.86;

          launchVx = (pullScreenX / screenDist) / (scale * depth) * clampedDist;
          launchVy = (pullScreenY / screenDist) / (scale * pitch) * clampedDist;
          this.launchPiece(this.selectedPiece, launchVx, launchVy, clampedDist);
        }

        if (this.multiplayerMode && typeof this.onPieceLaunchBroadcast === 'function') {
          this.onPieceLaunchBroadcast({
            pieceId: this.selectedPiece.id,
            vx: launchVx,
            vy: launchVy,
            dist: clampedDist,
            powerRatio
          });
        }
      } else {
        if (this.multiplayerMode && typeof this.onAimCancel === 'function') {
          this.onAimCancel();
        }
      }
      this.selectedPiece = null;
    };

    if (window.PointerEvent) {
      this.canvas.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      this.canvas.addEventListener('mousedown', handlePointerDown);
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      this.canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }

    // Keyboard Gameplay Listeners (Tracker Parity)
    window.addEventListener('keydown', (e) => {
      // Do not intercept keystrokes when typing into input fields or modals
      const targetTag = e.target ? (e.target.tagName || '').toUpperCase() : '';
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
        return;
      }
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter', 'Escape'].includes(e.code)) {
        this.handleKeyboardControl(e);
      }
    });
  }

  handleKeyboardControl(e) {
    if (this.audio) this.audio.init();
    if (this.isGameOver) return;
    if (this.gameMode === 'bot' && this.currentTurn === 'black') return;
    const livingActivePieces = this.pieces.filter(p => !p.dead && p.team === this.currentTurn && (p.type !== 'king' || p.awakened));
    if (livingActivePieces.length === 0) return;

    if (e.code === 'Tab') {
      e.preventDefault();
      this.keyboardTargetIndex = (this.keyboardTargetIndex + (e.shiftKey ? -1 : 1) + livingActivePieces.length) % livingActivePieces.length;
      this.selectedPiece = livingActivePieces[this.keyboardTargetIndex];
      this.keyboardAiming = true;
      this.logTelemetry('KBD_FOCUS', `Focused [${this.selectedPiece.type.toUpperCase()}] via keyboard`);
    } else if (this.keyboardAiming && this.selectedPiece) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.keyboardAimAngle -= 0.08;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.keyboardAimAngle += 0.08;
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.keyboardAimPower = Math.min(1.0, this.keyboardAimPower + 0.08);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.keyboardAimPower = Math.max(0.15, this.keyboardAimPower - 0.08);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const dist = this.keyboardAimPower * this.maxPullDistance;
        const pullX = Math.cos(this.keyboardAimAngle) * dist;
        const pullY = Math.sin(this.keyboardAimAngle) * dist;
        this.launchPiece(this.selectedPiece, pullX, pullY, dist);
        this.keyboardAiming = false;
        this.selectedPiece = null;
      } else if (e.code === 'Escape') {
        this.keyboardAiming = false;
        this.selectedPiece = null;
      }
    }
  }

  launchPiece(piece, pullX, pullY, pullDist) {
    if (piece.immovable || (piece.type === 'king' && !piece.awakened)) return;
    const clampedDist = Math.min(pullDist, this.maxPullDistance);
    const powerRatio = clampedDist / this.maxPullDistance;
    const impulse = clampedDist * PHYSICS_CONFIG.LAUNCH_IMPULSE * piece.speedMulti;
    const angle = Math.atan2(pullY, pullX);

    piece.vx = Math.cos(angle) * impulse;
    piece.vy = Math.sin(angle) * impulse;

    if (piece.type === 'king' && piece.awakened) {
      this.spawnImpactParticles(piece.x, piece.y, 25, false, piece.team === 'white' ? ['#ffd700', '#00e1d9', '#ffffff'] : ['#ff4757', '#ff7675', '#ffffff']);
      this.audio.playLaunch(1.4);
      this.logTelemetry('SOVEREIGN_LAUNCH', `👑 ${piece.team.toUpperCase()} Awakened King launched with sovereign kinetic force!`);
    } else {
      this.audio.playLaunch(powerRatio);
    this.logTelemetry('LAUNCH', `Launched ${piece.team}_${piece.type} at power ${(powerRatio * 100).toFixed(0)}%`);
    }

    // Cap maximum speed
    const speed = Math.hypot(piece.vx, piece.vy);
    const maxSpeed = PHYSICS_CONFIG.MAX_SPEED;
    if (speed > maxSpeed) {
      piece.vx = (piece.vx / speed) * maxSpeed;
      piece.vy = (piece.vy / speed) * maxSpeed;
    }
    piece.inMotion = true;
    piece.hasMoved = true;

    this.spawnLaunchSparks(piece.x, piece.y, angle);
    this.spawnShockwave(piece.x, piece.y, piece.team === 'white' ? '#ffd700' : '#ff4757', 36, 2.5);

    const teamName = piece.team === 'white' ? 'White' : 'Black';
    const pieceName = piece.type.toUpperCase();
    const powerPct = Math.round(powerRatio * 100);
    if (powerRatio > 0.82) {
      this.addCommentary(`High-velocity blast! ${teamName} ${pieceName} unleashed with ${powerPct}% kinetic force!`, 'strike', '🚀');
    } else {
      this.addCommentary(`${teamName} ${pieceName} strikes into combat at ${powerPct}% impulse.`, 'strike', '⚔️');
    }
  }

  /* -------------------------------------------------------------
     Kinetic Particle VFX Themes (v3.3.0)
     Themes: 'sovereign_sparks', 'cosmic_nebula', 'neon_arc', 'void_embers'
  ------------------------------------------------------------- */
  setParticleTheme(theme) {
    const validThemes = ['sovereign_sparks', 'cosmic_nebula', 'neon_arc', 'void_embers'];
    if (validThemes.includes(theme)) {
      this.particleTheme = theme;
      try {
        localStorage.setItem('archess_particle_theme', theme);
      } catch (e) {}
    }
  }

  getParticleThemePalette(theme = null) {
    const t = theme || this.particleTheme || 'sovereign_sparks';
    switch (t) {
      case 'cosmic_nebula':
        return ['#a855f7', '#6366f1', '#06b6d4', '#ec4899', '#c084fc'];
      case 'neon_arc':
        return ['#00f0ff', '#ff0055', '#10b981', '#f43f5e', '#ffffff'];
      case 'void_embers':
        return ['#ef4444', '#f97316', '#eab308', '#7f1d1d', '#451a03'];
      case 'sovereign_sparks':
      default:
        return ['#ffd700', '#fde047', '#f59e0b', '#ffffff', '#fbbf24'];
    }
  }

  spawnParticleBurst(x, y, themeOverride = null, count = 36) {
    const theme = themeOverride || this.particleTheme || 'sovereign_sparks';
    const palette = this.getParticleThemePalette(theme);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6.5 + 2.0;
      const shape = theme === 'cosmic_nebula' ? 'nebula'
                  : theme === 'neon_arc' ? 'lightning'
                  : theme === 'void_embers' ? 'ember'
                  : 'star';
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: (theme === 'cosmic_nebula' ? Math.random() * 4.5 + 2.5 : Math.random() * 3.2 + 1.2),
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 1,
        life: Math.random() * 0.45 + 0.35,
        shape: shape,
        jitter: theme === 'neon_arc',
        thermalLift: theme === 'void_embers'
      });
    }
  }

  /* -------------------------------------------------------------
     Automated Tactical Match Commentary Stream (v3.3.0)
  ------------------------------------------------------------- */
  addCommentary(text, type = 'info', icon = '🎙️') {
    const entry = {
      id: 'comm_' + Math.random().toString(36).substring(2, 9),
      text,
      type, // 'strike', 'rebound', 'breach', 'shatter', 'sovereign', 'sudden_death', 'emote', 'victory', 'info'
      icon,
      timestamp: Date.now(),
      turn: this.currentTurn
    };
    if (!this.commentaryLog) this.commentaryLog = [];
    this.commentaryLog.unshift(entry);
    if (this.commentaryLog.length > 50) {
      this.commentaryLog.pop();
    }
    if (typeof this.onCommentary === 'function') {
      try {
        this.onCommentary(entry);
      } catch (e) {
        console.warn('onCommentary error:', e);
      }
    }
  }

  spawnShockwave(x, y, color = '#ffd700', maxRadius = 55, lineWidth = 3.5) {
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius,
      color,
      alpha: 1,
      lineWidth
    });
  }

  spawnLaunchSparks(x, y, angle) {
    const palette = this.getParticleThemePalette();
    const theme = this.particleTheme || 'sovereign_sparks';
    const shape = theme === 'cosmic_nebula' ? 'nebula'
                : theme === 'neon_arc' ? 'lightning'
                : theme === 'void_embers' ? 'ember'
                : 'star';
    for (let i = 0; i < 24; i++) {
      const spread = (Math.random() - 0.5) * 1.3;
      const speed = Math.random() * 5 + 1.8;
      this.particles.push({
        x: x,
        y: y,
        vx: -Math.cos(angle + spread) * speed,
        vy: -Math.sin(angle + spread) * speed,
        radius: Math.random() * 3 + 1,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 1,
        life: 0.55,
        shape: shape,
        jitter: theme === 'neon_arc',
        thermalLift: theme === 'void_embers'
      });
    }
  }

  spawnImpactParticles(x, y, count = 20, isCritical = false, customColors = null) {
    const theme = this.particleTheme || 'sovereign_sparks';
    const palette = this.getParticleThemePalette();
    const colors = customColors || (isCritical 
      ? ['#ff3344', '#ffaa00', '#ffffff', ...palette] 
      : palette);
    const shape = theme === 'cosmic_nebula' ? 'nebula'
                : theme === 'neon_arc' ? 'lightning'
                : theme === 'void_embers' ? 'ember'
                : 'star';

    for (let i = 0; i < count; i++) {
      const pAngle = Math.random() * Math.PI * 2;
      const pSpeed = Math.random() * (isCritical ? 7.5 : 4.8) + 1.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        radius: Math.random() * 3.5 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: Math.random() * 0.45 + 0.3,
        shape: shape,
        jitter: theme === 'neon_arc',
        thermalLift: theme === 'void_embers'
      });
    }
  }

  addDamageNumber(x, y, amount, isCritical = false, customColor = null, customText = null) {
    // User requirement: Upon collision, do NOT display any numeric text (-10 etc), just physical effect suggesting collision
    if (!customText) return;
    if (customText.includes('-') || customText.toLowerCase().includes('recoil') || customText.toLowerCase().includes('wall -')) return;

    this.damageNumbers.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y - 18,
      text: customText,
      color: customColor || (isCritical ? '#ff3b4e' : '#ffd700'),
      size: isCritical ? 20 : 15,
      alpha: 1,
      life: 1.2,
      vy: -1.4
    });
  }

  /* -------------------------------------------------------------
     Physics Update & Collision Solver
  ------------------------------------------------------------- */
  updatePhysics(dt) {
    const layout = this.getBoardLayout();
    const minX = layout.gridOriginX;
    const maxX = layout.gridOriginX + layout.gridSize;
    const minY = layout.gridOriginY;
    const maxY = layout.gridOriginY + layout.gridSize;
    let anyInMotion = false;

    // Movement & Wall bouncing
    this.pieces.forEach((p) => {
      if (p.dead) return;

      if (p.immovable) {
        p.vx = 0;
        p.vy = 0;
        p.x = p.originX;
        p.y = p.originY;
      } else {
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 0.15) {
          anyInMotion = true;
          p.hasMoved = true;
          p.x += p.vx;
          p.y += p.vy;

          p.vx *= this.friction;
          p.vy *= this.friction;

          // Particle trail (v3.3.0 theme-aware)
          if (speed > 3 && Math.random() < 0.45) {
            const theme = this.particleTheme || 'sovereign_sparks';
            const palette = this.getParticleThemePalette();
            const shape = theme === 'cosmic_nebula' ? 'nebula'
                        : theme === 'neon_arc' ? 'lightning'
                        : theme === 'void_embers' ? 'ember'
                        : 'star';
            this.particles.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              radius: (theme === 'cosmic_nebula' ? Math.random() * 3 + 1.8 : Math.random() * 2 + 1),
              color: palette[Math.floor(Math.random() * palette.length)],
              alpha: 0.5,
              life: 0.35,
              shape: shape,
              jitter: theme === 'neon_arc',
              thermalLift: theme === 'void_embers'
            });
          }

          // Arena Wall Collisions (with Bishop Prism Surge)
          const isBishop = p.type === 'bishop';
          const bounceCoeff = isBishop ? Math.min(1.15, p.bounce * 1.15) : p.bounce;

          if (p.x - p.radius < minX) {
            p.x = minX + p.radius;
            p.vx = -p.vx * bounceCoeff;
            if (isBishop) {
              this.spawnImpactParticles(p.x, p.y, 8, false);
              this.logTelemetry('PRISM_SURGE', 'Bishop gained +15% Prism Surge on wall reflection!');
            }
            this.audio.playBounce();
            if (speed > 4.2) {
              this.addCommentary(`Kinetic rebound! ${p.team.toUpperCase()} ${p.type.toUpperCase()} ricochets off western cushion!`, 'rebound', '⚡');
            }
          } else if (p.x + p.radius > maxX) {
            p.x = maxX - p.radius;
            p.vx = -p.vx * bounceCoeff;
            if (isBishop) {
              this.spawnImpactParticles(p.x, p.y, 8, false);
              this.logTelemetry('PRISM_SURGE', 'Bishop gained +15% Prism Surge on wall reflection!');
            }
            this.audio.playBounce();
            if (speed > 4.2) {
              this.addCommentary(`Kinetic rebound! ${p.team.toUpperCase()} ${p.type.toUpperCase()} ricochets off eastern cushion!`, 'rebound', '⚡');
            }
          }

          if (p.y - p.radius < minY) {
            p.y = minY + p.radius;
            p.vy = -p.vy * bounceCoeff;
            if (isBishop) {
              this.spawnImpactParticles(p.x, p.y, 8, false);
              this.logTelemetry('PRISM_SURGE', 'Bishop gained +15% Prism Surge on wall reflection!');
            }
            this.audio.playBounce();
            if (speed > 4.2) {
              this.addCommentary(`Kinetic rebound! ${p.team.toUpperCase()} ${p.type.toUpperCase()} ricochets off northern cushion!`, 'rebound', '⚡');
            }
          } else if (p.y + p.radius > maxY) {
            p.y = maxY - p.radius;
            p.vy = -p.vy * bounceCoeff;
            if (isBishop) {
              this.spawnImpactParticles(p.x, p.y, 8, false);
              this.logTelemetry('PRISM_SURGE', 'Bishop gained +15% Prism Surge on wall reflection!');
            }
            this.audio.playBounce();
            if (speed > 4.2) {
              this.addCommentary(`Kinetic rebound! ${p.team.toUpperCase()} ${p.type.toUpperCase()} ricochets off southern cushion!`, 'rebound', '⚡');
            }
          }
        } else {
          p.vx = 0;
          p.vy = 0;
        }
      }

      if (p.hitFlash > 0) p.hitFlash -= dt * 3;
      if (p.wallHitFlash > 0) p.wallHitFlash -= dt * 3;
    });

    // King Fortress Square Wall Collisions (Fits exact chessboard square, absorbs damage, and inflicts recoil on attacker)
    this.pieces.forEach((attacker) => {
      if (attacker.dead || attacker.type === 'king') return;
      const speed = Math.hypot(attacker.vx, attacker.vy);
      if (speed <= 0.15) return;

      this.pieces.forEach((king) => {
        if (king.dead || king.type !== 'king') return;

        // If King's Fortress Wall is active (fits exact chessboard square tile)
        if (king.wallActive && king.wallHp > 0) {
          const half = king.wallHalf || Math.round(layout.sqSize * 0.47);
          const minBoxX = king.x - half;
          const maxBoxX = king.x + half;
          const minBoxY = king.y - half;
          const maxBoxY = king.y + half;

          const closestX = Math.max(minBoxX, Math.min(attacker.x, maxBoxX));
          const closestY = Math.max(minBoxY, Math.min(attacker.y, maxBoxY));
          const cdx = attacker.x - closestX;
          const cdy = attacker.y - closestY;
          const dist = Math.hypot(cdx, cdy);

          if (dist < attacker.radius) {
            let nx = 0, ny = 0;
            if (dist > 0.001) {
              nx = cdx / dist;
              ny = cdy / dist;
            } else {
              const dLeft = Math.abs(attacker.x - minBoxX);
              const dRight = Math.abs(maxBoxX - attacker.x);
              const dTop = Math.abs(attacker.y - minBoxY);
              const dBtm = Math.abs(maxBoxY - attacker.y);
              const minD = Math.min(dLeft, dRight, dTop, dBtm);
              if (minD === dLeft) { nx = -1; ny = 0; }
              else if (minD === dRight) { nx = 1; ny = 0; }
              else if (minD === dTop) { nx = 0; ny = -1; }
              else { nx = 0; ny = 1; }
            }

            // Reposition attacker outside square wall perimeter
            attacker.x = closestX + nx * attacker.radius;
            attacker.y = closestY + ny * attacker.radius;

            // Enemy impact against King's wall
            if (attacker.team !== king.team) {
              const rvx = attacker.vx;
              const rvy = attacker.vy;
              const velAlongNormal = rvx * nx + rvy * ny;

              if (velAlongNormal < 0) {
                const hitSpeed = Math.hypot(rvx, rvy);
                const bounce = Math.max(0.68, attacker.bounce);
                attacker.vx = -nx * hitSpeed * bounce;
                attacker.vy = -ny * hitSpeed * bounce;

                // Wall takes blunt kinetic damage
                const wallDamage = Math.max(18, Math.round(hitSpeed * 4.2 * attacker.mass));
                king.wallHp -= wallDamage;
                king.wallHitFlash = 1.0;
                this.screenShake = 7;
                this.totalImpacts++;

                // Attacker takes balanced recoil self-damage from ramming into reinforced stone/energy fortress
                const recoilDmg = Math.max(2, Math.round(wallDamage * 0.12 + hitSpeed * 0.5));
                attacker.hp = Math.max(0, attacker.hp - recoilDmg);
                attacker.hitFlash = 1.0;

                this.audio.playImpact(hitSpeed / 4.5);
                this.spawnImpactParticles(attacker.x, attacker.y, 18, false, ['#00e1d9', '#67e8f9', '#ffd700', '#ffffff']);
                this.spawnShockwave(attacker.x, attacker.y, '#00e1d9', 46, 3);
                this.addDamageNumber(king.x, king.y - half, wallDamage, false, '#00e1d9', `WALL -${wallDamage}`);
                this.addDamageNumber(attacker.x, attacker.y, recoilDmg, false, '#f87171', `RECOIL -${recoilDmg}`);

                this.logTelemetry('FORTRESS_WALL_HIT', `${attacker.team.toUpperCase()} ${attacker.type.toUpperCase()} struck ${king.team.toUpperCase()} King's Fortress Wall! -${wallDamage} HP [${Math.max(0, Math.round(king.wallHp))}/${king.maxWallHp}] | Attacker Recoil: -${recoilDmg} HP`);
                this.addCommentary(`Bulkhead under fire! ${attacker.team.toUpperCase()} ${attacker.type.toUpperCase()} inflicts ${wallDamage} DMG on ${king.team.toUpperCase()} Citadel Wall (${Math.max(0, Math.round(king.wallHp))}/${king.maxWallHp} HP).`, 'breach', '🛡️');

                // Check if attacker dies from recoil
                if (attacker.hp <= 0 && !attacker.dead) {
                  attacker.dead = true;
                  attacker.hp = 0;
                  this.audio.playShatter();
                  this.spawnImpactParticles(attacker.x, attacker.y, 28, true);
                  this.spawnShockwave(attacker.x, attacker.y, '#f87171', 65, 4);
                  this.addDamageNumber(attacker.x, attacker.y, 0, true, '#ff3b4e', 'SHATTERED!');
                  if (!this.capturedPieces) this.capturedPieces = { white: [], black: [] };
                  this.capturedPieces[attacker.team].push(attacker.type);
                  if (this.onPieceCaptured) this.onPieceCaptured(attacker.team, attacker.type, this.getMaterialDiff());
                  this.logTelemetry('ELIMINATION', `[!] ${attacker.team.toUpperCase()} ${attacker.type.toUpperCase()} shattered from recoil impact against the King's Fortress Wall!`);
                  this.checkSovereignAwakening();
                }

                // Check if King's wall collapses
                if (king.wallHp <= 0) {
                  king.wallActive = false;
                  king.wallHp = 0;
                  this.audio.playShatter();
                  this.spawnImpactParticles(king.x, king.y, 55, true, ['#00e1d9', '#ffd700', '#ff3b4e', '#ffffff']);
                  this.spawnShockwave(king.x, king.y, '#ff3b4e', 90, 5);
                  this.screenShake = 16;
                  this.addDamageNumber(king.x, king.y - king.radius * 1.5, 0, true, '#ff3b4e', 'WALL BREACHED!');
                  this.logTelemetry('FORTRESS_BREACH', `[CRITICAL BREACH] ${king.team.toUpperCase()} King's Fortress Wall has collapsed! Citadel is now vulnerable!`);
                  this.addCommentary(`🚨 CITADEL BREACHED! ${king.team.toUpperCase()} King's Fortress Wall destroyed! The Sovereign is exposed!`, 'breach', '💥');
                }
              }
            } else {
              // Friendly piece soft cushion bounce off wall
              const velAlongNormal = attacker.vx * nx + attacker.vy * ny;
              if (velAlongNormal < 0) {
                attacker.vx -= velAlongNormal * nx * 1.2;
                attacker.vy -= velAlongNormal * ny * 1.2;
              }
            }
          }
        }
      });
    });

    // Pairwise Piece-to-Piece Collisions
    for (let i = 0; i < this.pieces.length; i++) {
      const p1 = this.pieces[i];
      if (p1.dead) continue;
      for (let j = i + 1; j < this.pieces.length; j++) {
        const p2 = this.pieces[j];
        if (p2.dead) continue;

        // While a King's wall is active, piece collisions with that King are handled by the wall perimeter solver above
        if ((p1.type === 'king' && p1.wallActive && p1.wallHp > 0) || (p2.type === 'king' && p2.wallActive && p2.wallHp > 0)) {
          continue;
        }

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Separation (respecting immovable Citadel King anchors)
          if (p1.immovable) {
            p2.x += nx * overlap;
            p2.y += ny * overlap;
          } else if (p2.immovable) {
            p1.x -= nx * overlap;
            p1.y -= ny * overlap;
          } else {
            p1.x -= nx * overlap * 0.5;
            p1.y -= ny * overlap * 0.5;
            p2.x += nx * overlap * 0.5;
            p2.y += ny * overlap * 0.5;
          }

          // Impulse transfer
          const rvx = p2.vx - p1.vx;
          const rvy = p2.vy - p1.vy;
          const velAlongNormal = rvx * nx + rvy * ny;

          if (velAlongNormal < 0) {
            const restitution = Math.min(p1.bounce, p2.bounce);
            const impulseScalar = -(1 + restitution) * velAlongNormal / (1 / p1.mass + 1 / p2.mass);

            if (p1.immovable) {
              p1.vx = 0;
              p1.vy = 0;
              p2.vx += (impulseScalar / p2.mass) * nx;
              p2.vy += (impulseScalar / p2.mass) * ny;
            } else if (p2.immovable) {
              p2.vx = 0;
              p2.vy = 0;
              p1.vx -= (impulseScalar / p1.mass) * nx;
              p1.vy -= (impulseScalar / p1.mass) * ny;
            } else {
              p1.vx -= (impulseScalar / p1.mass) * nx;
              p1.vy -= (impulseScalar / p1.mass) * ny;
              p2.vx += (impulseScalar / p2.mass) * nx;
              p2.vy += (impulseScalar / p2.mass) * ny;
            }

            const relativeSpeed = Math.hypot(rvx, rvy);
            if (relativeSpeed > 0.8) {
              // Damage opposing team
              if (p1.team !== p2.team) {
                // Rook Siege Breaker: 2.5x damage against lighter pieces
                let damageMulti = 1.0;
                if (p1.type === 'rook' && p2.mass < p1.mass) {
                  damageMulti = 2.5;
                  p1.vx *= 0.15;
                  p1.vy *= 0.15;
                } else if (p2.type === 'rook' && p1.mass < p2.mass) {
                  damageMulti = 2.5;
                  p2.vx *= 0.15;
                  p2.vy *= 0.15;
                }

                // Determine primary striker vs defender based on incoming velocity
                const speed1 = Math.hypot(p1.vx, p1.vy);
                const speed2 = Math.hypot(p2.vx, p2.vy);

                let striker = p1;
                let defender = p2;
                if (speed2 > speed1) {
                  striker = p2;
                  defender = p1;
                }

                // Logical primary impact damage dealt to defender
                let primaryDamage = Math.max(10, Math.round(relativeSpeed * 3.6 * striker.mass * damageMulti));

                // Logical recoil self-damage taken by striker from the physical collision
                let recoilDamage = Math.max(4, Math.round(relativeSpeed * 1.1 * defender.mass));

                // Queen Supernova Discharge on high velocity
                if ((p1.type === 'queen' || p2.type === 'queen') && relativeSpeed > 5.5) {
                  primaryDamage += 35;
                  this.screenShake = 12;
                  this.spawnImpactParticles((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 35, true);
                  this.logTelemetry('SUPERNOVA', 'Queen discharged Supernova blast on high-velocity strike!');
                }

                // Awakened King Sovereign Strike: crushing momentum & concussive retribution wave
                if ((p1.type === 'king' && p1.awakened) || (p2.type === 'king' && p2.awakened)) {
                  const sovereign = (p1.type === 'king' && p1.awakened) ? p1 : p2;
                  if (striker === sovereign) {
                    primaryDamage = Math.max(35, Math.round(primaryDamage * 1.5));
                    this.screenShake = 15;
                    this.spawnImpactParticles((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 35, true, sovereign.team === 'white' ? ['#ffd700', '#00e1d9'] : ['#ff4757', '#ff7675']);
                    this.logTelemetry('SOVEREIGN_STRIKE', `👑 ${sovereign.team.toUpperCase()} Awakened King landed crushing Sovereign Strike (-${primaryDamage} HP)!`);
                  }
                }

                // King Bastion Aura: friendly pawns near King take 35% less damage
                if (defender.type === 'pawn') {
                  const friendlyKing = this.pieces.find(k => !k.dead && k.team === defender.team && k.type === 'king');
                  if (friendlyKing && Math.hypot(friendlyKing.x - defender.x, friendlyKing.y - defender.y) < 85) {
                    primaryDamage = Math.round(primaryDamage * 0.65);
                    this.logTelemetry('BASTION_AURA', `${defender.team.toUpperCase()} Pawn protected by King's Bastion Aura (-35% dmg)!`);
                  }
                }
                if (striker.type === 'pawn') {
                  const friendlyKing = this.pieces.find(k => !k.dead && k.team === striker.team && k.type === 'king');
                  if (friendlyKing && Math.hypot(friendlyKing.x - striker.x, friendlyKing.y - striker.y) < 85) {
                    recoilDamage = Math.round(recoilDamage * 0.65);
                  }
                }

                // Knight Shockwave
                if (p1.type === 'knight' || p2.type === 'knight') {
                  const knight = p1.type === 'knight' ? p1 : p2;
                  const other = p1.type === 'knight' ? p2 : p1;
                  const cx = (p1.x + p2.x) / 2;
                  const cy = (p1.y + p2.y) / 2;
                  let knockbackCount = 0;

                  this.pieces.forEach(target => {
                    if (!target.dead && target.team === other.team && target !== other) {
                      const tdx = target.x - cx;
                      const tdy = target.y - cy;
                      const dist = Math.hypot(tdx, tdy);
                      if (dist < 95 && dist > 1) {
                        const impulse = ((95 - dist) / 95) * 3.5;
                        target.vx += (tdx / dist) * impulse;
                        target.vy += (tdy / dist) * impulse;
                        knockbackCount++;
                      }
                    }
                  });

                  if (knockbackCount > 0) {
                    this.logTelemetry('SHOCKWAVE', `Knight triggered Shockwave! Knocks back ${knockbackCount} enemy units.`);
                    this.spawnImpactParticles(cx, cy, 18, false);
                  }
                }

                const isCritical = relativeSpeed > 6.0 || damageMulti > 1.5;
                defender.hp = Math.max(0, defender.hp - primaryDamage);
                striker.hp = Math.max(0, striker.hp - recoilDamage);
                defender.hitFlash = 1;
                striker.hitFlash = 1;

                if (striker.team === 'white') this.whiteDamage += primaryDamage;
                else this.blackDamage += primaryDamage;

                if (!this.pieceDamageDealt) this.pieceDamageDealt = {};
                if (!this.pieceKills) this.pieceKills = {};
                const strikerKey = striker.id || `${striker.team}_${striker.type}`;
                this.pieceDamageDealt[strikerKey] = (this.pieceDamageDealt[strikerKey] || 0) + primaryDamage;

                this.addDamageNumber(defender.x, defender.y, primaryDamage, isCritical);
                this.addDamageNumber(striker.x, striker.y, recoilDamage, false, '#f87171', `RECOIL -${recoilDamage}`);

                this.screenShake = isCritical ? 7 : 3;
                this.spawnShockwave(cx, cy, isCritical ? '#ffd700' : (striker.team === 'white' ? '#ffd700' : '#ff4757'), isCritical ? 65 : 42, isCritical ? 4 : 2.5);
                this.totalImpacts++;
                this.audio.playImpact(relativeSpeed / 6);

                this.logTelemetry('COLLISION', `${striker.team}_${striker.type} struck ${defender.team}_${defender.type} | Dmg: -${primaryDamage} HP | Recoil: -${recoilDamage} HP | RelSpeed: ${relativeSpeed.toFixed(1)}`);
                if (isCritical) {
                  this.addCommentary(`CRITICAL IMPACT! ${striker.team.toUpperCase()} ${striker.type.toUpperCase()} inflicts ${primaryDamage} DMG on ${defender.team.toUpperCase()} ${defender.type.toUpperCase()}!`, 'strike', '💥');
                } else {
                  this.addCommentary(`Direct hit! ${striker.team.toUpperCase()} ${striker.type.toUpperCase()} strikes ${defender.team.toUpperCase()} ${defender.type.toUpperCase()} for ${primaryDamage} DMG.`, 'strike', '⚔️');
                }

                // Death checks
                [p1, p2].forEach(p => {
                  if (p.hp <= 0 && !p.dead) {
                    p.dead = true;
                    p.hp = 0;
                    if (p === defender) {
                      const sKey = striker.id || `${striker.team}_${striker.type}`;
                      this.pieceKills[sKey] = (this.pieceKills[sKey] || 0) + 1;
                    }
                    this.spawnImpactParticles(p.x, p.y, 35, true);
                    this.spawnShockwave(p.x, p.y, p.team === 'white' ? '#ffd700' : '#ff3b4e', 75, 4.5);
                    this.audio.playShatter();
                    if (!this.capturedPieces) this.capturedPieces = { white: [], black: [] };
                    this.capturedPieces[p.team].push(p.type);
                    if (this.onPieceCaptured) {
                      this.onPieceCaptured(p.team, p.type, this.getMaterialDiff());
                    }
                    this.logTelemetry('ELIMINATION', `[!] ${p.team.toUpperCase()} ${p.type.toUpperCase()} shattered and removed from board.`);
                    this.addCommentary(`SHATTERED! ${p.team.toUpperCase()} ${p.type.toUpperCase()} neutralized and eliminated from combat!`, 'shatter', '💀');
                    this.checkSovereignAwakening();
                    if (p.type === 'king') {
                      this.handleKingElimination(p);
                    }
                  }
                });

                // Anchor immovable Citadel pieces firmly at origin
                if (p1.immovable) {
                  p1.vx = 0;
                  p1.vy = 0;
                  p1.x = p1.originX;
                  p1.y = p1.originY;
                }
                if (p2.immovable) {
                  p2.vx = 0;
                  p2.vy = 0;
                  p2.x = p2.originX;
                  p2.y = p2.originY;
                }
              }
            }
          }
        }
      }
    }

    // Settlement & Turn Transition
    if (this.simulationSettling && !anyInMotion) {
      this.simulationSettling = false;
      this.turns++;
      this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
      this.turnStartTime = performance.now();
      this.updateHUD();
      this.logTelemetry('SETTLEMENT', `Board settled at rest. Turn ${this.turns}: passed to ${this.currentTurn.toUpperCase()}.`);

      // Check if either King (or both Kings) should awaken into mobile combat
      this.checkSovereignAwakening();

      // If current turn player has 0 mobile pieces while opponent still has mobile pieces, auto-pass turn
      const currentMobile = this.pieces.filter(p => !p.dead && p.team === this.currentTurn && (p.type !== 'king' || p.awakened)).length;
      const opponentTeam = this.currentTurn === 'white' ? 'black' : 'white';
      const opponentMobile = this.pieces.filter(p => !p.dead && p.team === opponentTeam && (p.type !== 'king' || p.awakened)).length;
      if (currentMobile === 0 && opponentMobile > 0 && !this.isGameOver) {
        this.logTelemetry('TURN_PASSED', `${this.currentTurn.toUpperCase()} has no mobile pieces remaining! Turn passed to ${opponentTeam.toUpperCase()}.`);
        this.currentTurn = opponentTeam;
        this.updateHUD();
      }

      if (!this.isGameOver && this.currentTurn === 'black' && this.gameMode === 'bot') {
        this.triggerBotTurn();
      }
    } else if (anyInMotion) {
      this.simulationSettling = true;
    }

    // Particles & Damage text updates
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.jitter) {
        p.x += (Math.random() - 0.5) * 1.8;
        p.y += (Math.random() - 0.5) * 1.8;
      }
      if (p.thermalLift) {
        p.vy -= 0.06;
      }
      p.alpha -= dt / p.life;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y += d.vy;
      d.alpha -= dt / d.life;
      if (d.alpha <= 0) this.damageNumbers.splice(i, 1);
    }

    // Shockwaves expansion and decay
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.18 + 1.2;
      sw.alpha -= dt * 2.2;
      sw.lineWidth = Math.max(0.6, sw.lineWidth * 0.94);
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Screen Shake decay
    if (this.screenShake > 0) {
      this.screenShake -= dt * 25;
      if (this.screenShake < 0) this.screenShake = 0;
    }
  }

  checkSovereignAwakening() {
    const whiteVanguard = this.pieces.filter(p => !p.dead && p.team === 'white' && p.type !== 'king').length;
    const blackVanguard = this.pieces.filter(p => !p.dead && p.team === 'black' && p.type !== 'king').length;
    const whiteKing = this.pieces.find(p => !p.dead && p.team === 'white' && p.type === 'king');
    const blackKing = this.pieces.find(p => !p.dead && p.team === 'black' && p.type === 'king');

    if (whiteVanguard === 0 && whiteKing && !whiteKing.awakened) {
      this.awakenKing(whiteKing);
    }
    if (blackVanguard === 0 && blackKing && !blackKing.awakened) {
      this.awakenKing(blackKing);
    }

    if (whiteVanguard === 0 && blackVanguard === 0 && !this.isGameOver && !this.suddenDeathMode) {
      this.suddenDeathMode = true;
      this.audio.startSuddenDeathDrone();
      this.logTelemetry('SUDDEN_DEATH', '👑 SOVEREIGN SHOWDOWN! Both armies depleted — Kings enter Sudden Death Duel!');
      this.addCommentary('⚠️ SUDDEN DEATH DUEL! All vanguard depleted — Sovereign duel determines match outcome!', 'sudden_death', '⚠️');
      if (window.ArchessToast) {
        window.ArchessToast.show('👑 SOVEREIGN SHOWDOWN: SUDDEN DEATH! Both Kings mobile for the final duel!', 'warning', 4500, 'SUDDEN DEATH');
      }
    }
  }

  awakenKing(king) {
    king.awakened = true;
    king.immovable = false;
    king.wallActive = false;
    king.wallHp = 0;
    king.speedMulti = 1.35;
    king.mass = 2.6;
    king.bounce = 0.85;

    this.audio.playAwakening();
    this.audio.playImpact(1.6);
    this.screenShake = 14;
    this.spawnImpactParticles(king.x, king.y, 45, true, king.team === 'white' ? ['#ffd700', '#00e1d9', '#ffffff'] : ['#ff4757', '#ff7675', '#ffffff']);
    this.addDamageNumber(king.x, king.y - king.radius * 1.6, 0, true, king.team === 'white' ? '#ffd700' : '#ff4757', '👑 SOVEREIGN AWAKENED!');

    if (window.ArchessToast) {
      window.ArchessToast.success(`👑 The ${king.team === 'white' ? 'White' : 'Black'} King Awakens! Immovable anchor broken — Mobile Combat active!`);
    }
    this.logTelemetry('SOVEREIGN_AWAKENED', `${king.team.toUpperCase()} King has awakened into mobile combat!`);
    this.addCommentary(`👑 SOVEREIGN AWAKENED! ${king.team === 'white' ? 'White' : 'Black'} King breaks citadel anchor to enter mobile combat!`, 'sovereign', '👑');
    this.updateHUD();
  }

  updateHUD() {
    const turnLabel = document.getElementById('arenaTurnLabel');
    const turnCircle = document.getElementById('arenaTurnCircle');
    if (this.isGameOver) {
      if (turnLabel) {
        turnLabel.textContent = this.winner === 'draw'
          ? 'MATCH DRAWN — STALEMATE / INSUFFICIENT MATERIAL'
          : `VICTORY! ${this.winner.toUpperCase()} ARMY CONQUERED THE BOARD!`;
      }
      if (turnCircle) {
        turnCircle.className = `turn-circle ${this.winner === 'black' ? 'black-turn' : ''}`;
        turnCircle.style.background = this.winner === 'draw' ? 'var(--gold-light)' : (this.winner === 'white' ? 'var(--gold-bright)' : 'var(--accent-crimson)');
      }
    } else {
      const activeKing = this.pieces.find(p => !p.dead && p.team === this.currentTurn && p.type === 'king');
      if (turnLabel) {
        if (this.suddenDeathMode) {
          turnLabel.textContent = `⚡ SUDDEN DEATH DUEL: ${this.currentTurn.toUpperCase()} KING — AIM & LAUNCH!`;
        } else if (activeKing && activeKing.awakened) {
          turnLabel.textContent = `👑 ${this.currentTurn.toUpperCase()}'S TURN — SOVEREIGN STRIKE! (King Mobile)`;
        } else {
          turnLabel.textContent = `${this.currentTurn.toUpperCase()}'S TURN — AIM & LAUNCH`;
        }
      }
      if (turnCircle) {
        turnCircle.className = `turn-circle ${this.currentTurn === 'black' ? 'black-turn' : ''}`;
        turnCircle.style.background = '';
      }
    }

    const whiteAlive = this.pieces.filter(p => !p.dead && p.team === 'white').length;
    const blackAlive = this.pieces.filter(p => !p.dead && p.team === 'black').length;

    const statsElem = document.getElementById('arenaPieceCounts');
    if (statsElem) {
      statsElem.innerHTML = `White: <strong>${whiteAlive}</strong> | Black: <strong>${blackAlive}</strong>`;
    }
  }

  /* -------------------------------------------------------------
     Rendering (Board, Squares, Staunton Vector Pieces, 3D Slab)
  ------------------------------------------------------------- */
  renderBoard() {
    const ctx = this.ctx;
    const layout = this.getBoardLayout();
    const { boardSize, originX, originY, borderSize, gridOriginX, gridOriginY, gridSize, sqSize } = layout;

    // Theme Palettes (Unified with React Chessboard theme)
    const palettes = {
      midnight: {
        darkSq: '#1e2632',
        lightSq: '#364353',
        borderBg: '#0f141c',
        borderColor: '#d4af37',
        inlayColor: 'rgba(212, 175, 55, 0.35)',
        gridLine: 'rgba(212, 175, 55, 0.10)',
        coordText: '#f5e29f',
        slabSide: '#080c14'
      },
      woodland: {
        darkSq: '#8b5a2b',
        lightSq: '#e0c9a6',
        borderBg: '#3d2514',
        borderColor: '#c68a4c',
        inlayColor: 'rgba(218, 165, 32, 0.40)',
        gridLine: 'rgba(0, 0, 0, 0.15)',
        coordText: '#f5dfb8',
        slabSide: '#201209'
      },
      ivory: {
        darkSq: '#4f5d75',
        lightSq: '#e8edf3',
        borderBg: '#1e2229',
        borderColor: '#98a6bd',
        inlayColor: 'rgba(200, 210, 225, 0.35)',
        gridLine: 'rgba(0, 0, 0, 0.12)',
        coordText: '#d8dee9',
        slabSide: '#11141a'
      },
      emerald: {
        darkSq: '#2e6b47',
        lightSq: '#e1d7b5',
        borderBg: '#133520',
        borderColor: '#73b088',
        inlayColor: 'rgba(115, 176, 136, 0.40)',
        gridLine: 'rgba(0, 0, 0, 0.12)',
        coordText: '#e8f5ec',
        slabSide: '#0b2013'
      },
      cyberpunk: {
        darkSq: '#14092b',
        lightSq: '#2f1559',
        borderBg: '#090317',
        borderColor: '#00f3ff',
        inlayColor: 'rgba(0, 243, 255, 0.45)',
        gridLine: 'rgba(255, 0, 128, 0.25)',
        coordText: '#00f3ff',
        slabSide: '#04010a'
      },
      bloodstone: {
        darkSq: '#59111e',
        lightSq: '#2a1a1f',
        borderBg: '#1a0408',
        borderColor: '#e84158',
        inlayColor: 'rgba(232, 65, 88, 0.40)',
        gridLine: 'rgba(255, 255, 255, 0.08)',
        coordText: '#ffccd3',
        slabSide: '#0d0205'
      },
      oceanic: {
        darkSq: '#1b3f61',
        lightSq: '#6896b8',
        borderBg: '#0b1d30',
        borderColor: '#38d9a9',
        inlayColor: 'rgba(56, 217, 169, 0.38)',
        gridLine: 'rgba(0, 0, 0, 0.14)',
        coordText: '#c7fced',
        slabSide: '#05101a'
      }
    };
    const pal = palettes[this.boardTheme] || palettes.midnight;

    // 1. Stage background clear
    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. In 3D mode: Draw Physical 3D Extruded Board Slab (thickness & bevels)
    if (this.renderMode === '3d') {
      const slabDepth = 20;
      // Bottom 4 corners of slab
      const b1 = this.toScreen(originX, originY, -slabDepth);
      const b2 = this.toScreen(originX + boardSize, originY, -slabDepth);
      const b3 = this.toScreen(originX + boardSize, originY + boardSize, -slabDepth);
      const b4 = this.toScreen(originX, originY + boardSize, -slabDepth);

      // Top 4 corners of slab
      const t1 = this.toScreen(originX, originY, 0);
      const t2 = this.toScreen(originX + boardSize, originY, 0);
      const t3 = this.toScreen(originX + boardSize, originY + boardSize, 0);
      const t4 = this.toScreen(originX, originY + boardSize, 0);

      // Deep ground contact shadow underneath slab
      ctx.beginPath();
      ctx.moveTo(b1.x - 14, b1.y + 8);
      ctx.lineTo(b2.x + 14, b2.y + 8);
      ctx.lineTo(b3.x + 20, b3.y + 12);
      ctx.lineTo(b4.x - 20, b4.y + 12);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fill();

      // Left Bevel Face (t1 -> t4 -> b4 -> b1)
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t4.x, t4.y);
      ctx.lineTo(b4.x, b4.y);
      ctx.lineTo(b1.x, b1.y);
      ctx.closePath();
      const leftGrad = ctx.createLinearGradient(t1.x, 0, t4.x, 0);
      leftGrad.addColorStop(0, pal.slabSide);
      leftGrad.addColorStop(1, pal.borderBg);
      ctx.fillStyle = leftGrad;
      ctx.fill();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Right Bevel Face (t2 -> t3 -> b3 -> b2)
      ctx.beginPath();
      ctx.moveTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(b3.x, b3.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.closePath();
      const rightGrad = ctx.createLinearGradient(t2.x, 0, t3.x, 0);
      rightGrad.addColorStop(0, pal.slabSide);
      rightGrad.addColorStop(1, pal.borderBg);
      ctx.fillStyle = rightGrad;
      ctx.fill();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Front Bevel Face (t4 -> t3 -> b3 -> b4)
      ctx.beginPath();
      ctx.moveTo(t4.x, t4.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(b3.x, b3.y);
      ctx.lineTo(b4.x, b4.y);
      ctx.closePath();
      const frontGrad = ctx.createLinearGradient(0, t4.y, 0, b4.y);
      frontGrad.addColorStop(0, pal.borderBg);
      frontGrad.addColorStop(1, pal.slabSide);
      ctx.fillStyle = frontGrad;
      ctx.fill();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // 3. Board Grid & Squares
    if (this.renderMode === '2d') {
      // Clear stage in 2D mode
      ctx.fillStyle = pal.borderBg || '#0f141c';
      ctx.fillRect(0, 0, this.width, this.height);

      // 8x8 Board Squares (Edge-to-edge, matching Classic UI)
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isDark = (r + c) % 2 === 1;
          const color = isDark ? pal.darkSq : pal.lightSq;
          const sqX = gridOriginX + c * sqSize;
          const sqY = gridOriginY + r * sqSize;

          ctx.fillStyle = color;
          ctx.fillRect(sqX, sqY, sqSize, sqSize);
        }
      }

      // Board perimeter accent line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(gridOriginX, gridOriginY, gridSize, gridSize);

      // Alphanumeric Coordinates rendered inside edge squares (Exact Classic / React Chessboard style)
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
      const coordFontSize = Math.max(10, Math.round(sqSize * 0.16));
      ctx.font = `700 ${coordFontSize}px Outfit, sans-serif`;

      // File labels (a-h on rank 1 / row 7, bottom-right of each square)
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      for (let c = 0; c < 8; c++) {
        const isDark = (7 + c) % 2 === 1;
        ctx.fillStyle = isDark ? pal.lightSq : pal.darkSq;
        ctx.fillText(files[c], gridOriginX + (c + 1) * sqSize - 4, gridOriginY + 8 * sqSize - 3);
      }

      // Rank labels (8-1 on file a / col 0, top-left of each square)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (let r = 0; r < 8; r++) {
        const isDark = r % 2 === 1;
        ctx.fillStyle = isDark ? pal.lightSq : pal.darkSq;
        ctx.fillText(ranks[r], gridOriginX + 4, gridOriginY + r * sqSize + 3);
      }
    } else {
      // 3D Top Frame Quad
      const t1 = this.toScreen(originX, originY);
      const t2 = this.toScreen(originX + boardSize, originY);
      const t3 = this.toScreen(originX + boardSize, originY + boardSize);
      const t4 = this.toScreen(originX, originY + boardSize);

      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y);
      ctx.lineTo(t2.x, t2.y);
      ctx.lineTo(t3.x, t3.y);
      ctx.lineTo(t4.x, t4.y);
      ctx.closePath();
      ctx.fillStyle = pal.borderBg;
      ctx.fill();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 3D 8x8 Board Squares Projection
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isDark = (r + c) % 2 === 1;
          const color = isDark ? pal.darkSq : pal.lightSq;
          const sqX = gridOriginX + c * sqSize;
          const sqY = gridOriginY + r * sqSize;

          const p1 = this.toScreen(sqX, sqY);
          const p2 = this.toScreen(sqX + sqSize, sqY);
          const p3 = this.toScreen(sqX + sqSize, sqY + sqSize);
          const p4 = this.toScreen(sqX, sqY + sqSize);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = pal.gridLine;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // 3D Cushion Perimeter Border
      const g1 = this.toScreen(gridOriginX, gridOriginY);
      const g2 = this.toScreen(gridOriginX + gridSize, gridOriginY);
      const g3 = this.toScreen(gridOriginX + gridSize, gridOriginY + gridSize);
      const g4 = this.toScreen(gridOriginX, gridOriginY + gridSize);

      ctx.beginPath();
      ctx.moveTo(g1.x, g1.y);
      ctx.lineTo(g2.x, g2.y);
      ctx.lineTo(g3.x, g3.y);
      ctx.lineTo(g4.x, g4.y);
      ctx.closePath();
      ctx.strokeStyle = pal.borderColor;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // 3D Alphanumeric Rank & File Coordinates (Standard Bottom a-h and Left 1-8 border)
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
      const coordFontSize = Math.max(10, Math.round(sqSize * 0.20));
      ctx.font = `700 ${coordFontSize}px Outfit, sans-serif`;
      ctx.fillStyle = pal.coordText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const borderOffset = borderSize * 0.44;

      for (let c = 0; c < 8; c++) {
        const fx = gridOriginX + c * sqSize + sqSize / 2;
        const btmPos = this.toScreen(fx, originY + boardSize - borderOffset);
        ctx.fillText(files[c], btmPos.x, btmPos.y);
      }

      for (let r = 0; r < 8; r++) {
        const fy = gridOriginY + r * sqSize + sqSize / 2;
        const leftPos = this.toScreen(originX + borderOffset, fy);
        ctx.fillText(ranks[r], leftPos.x, leftPos.y);
      }
    }
  }

  renderTrajectory() {
    const sourcePiece = this.selectedPiece;
    if (!sourcePiece) return;

    let dirScreenX = 0;
    let dirScreenY = 0;
    let powerRatio = 0;
    let active = false;

    if (this.isDragging) {
      const pullScreenX = this.dragScreenAnchor.x - this.dragScreenCurrent.x;
      const pullScreenY = this.dragScreenAnchor.y - this.dragScreenCurrent.y;
      const screenDist = Math.hypot(pullScreenX, pullScreenY);
      if (screenDist >= 10) {
        active = true;
        const clampedDist = Math.min(screenDist, this.maxPullDistance);
        powerRatio = clampedDist / this.maxPullDistance;
        dirScreenX = pullScreenX / screenDist;
        dirScreenY = pullScreenY / screenDist;
      }
    } else if (this.keyboardAiming) {
      active = true;
      powerRatio = this.keyboardAimPower;
      const boardDirX = Math.cos(this.keyboardAimAngle);
      const boardDirY = Math.sin(this.keyboardAimAngle);
      if (this.renderMode === '2d') {
        dirScreenX = boardDirX;
        dirScreenY = boardDirY;
      } else {
        const layout = this.getBoardLayout();
        const centerY = this.height / 2;
        const ny = (sourcePiece.y - centerY) / (layout.boardSize / 2);
        const depth = 1 + ny * 0.18;
        const pitch = 0.68;
        const scale = 0.86;
        const sx = boardDirX * scale * depth;
        const sy = boardDirY * scale * pitch;
        const sHypot = Math.hypot(sx, sy) || 1;
        dirScreenX = sx / sHypot;
        dirScreenY = sy / sHypot;
      }
    }

    if (!active) return;

    const ctx = this.ctx;
    ctx.save();

    const elevation = this.renderMode === '3d' ? (this.isDragging ? 26 : 14) : 0;
    const start = this.toScreen(sourcePiece.x, sourcePiece.y, elevation);
    const aimLen = 120 + powerRatio * 170;
    const end = {
      x: start.x + dirScreenX * aimLen,
      y: start.y + dirScreenY * aimLen
    };

    const isMaxPower = powerRatio > 0.85;
    const themeColor = isMaxPower ? '#ff3b4e' : '#ffd700';

    // 1. Animated Marching-Dash Aim Vector
    const dashOffset = -(performance.now() * 0.04) % 18;
    ctx.beginPath();
    ctx.setLineDash([8, 10]);
    ctx.lineDashOffset = dashOffset;
    ctx.lineWidth = 3.5 + powerRatio * 2.0;
    ctx.strokeStyle = themeColor;
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 12 + powerRatio * 8;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 2. Trajectory Arrowhead
    const arrowAngle = Math.atan2(dirScreenY, dirScreenX);
    const arrowLen = 14 + powerRatio * 4;
    ctx.beginPath();
    ctx.fillStyle = themeColor;
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - arrowLen * Math.cos(arrowAngle - Math.PI / 6),
      end.y - arrowLen * Math.sin(arrowAngle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - arrowLen * Math.cos(arrowAngle + Math.PI / 6),
      end.y - arrowLen * Math.sin(arrowAngle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // High-power kinetic pulse beacon
    if (isMaxPower) {
      const pulseSize = 6 + Math.sin(performance.now() * 0.015) * 3;
      ctx.beginPath();
      ctx.arc(end.x, end.y, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 71, 87, 0.45)';
      ctx.fill();
    }

    // 3. Power Reticle around piece
    const layout = this.getBoardLayout();
    const centerY = this.height / 2;
    const ny = (sourcePiece.y - centerY) / (layout.boardSize / 2);
    const depth = this.renderMode === '3d' ? (1 + ny * 0.18) : 1;
    const pitch = this.renderMode === '3d' ? 0.68 : 1;

    ctx.beginPath();
    const ringRadius = (sourcePiece.radius + 12) * depth;
    ctx.ellipse(start.x, start.y, ringRadius, ringRadius * pitch, 0, 0, Math.PI * 2 * powerRatio);
    ctx.strokeStyle = isMaxPower ? '#ff3b4e' : '#f5df88';
    ctx.lineWidth = 3;
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();

    // 4. Opponent Real-Time Aim Preview (Multiplayer Mode)
    if (this.opponentAim && this.opponentAim.pieceId) {
      const oppPiece = this.pieces.find(p => p.id === this.opponentAim.pieceId && !p.dead);
      if (oppPiece) {
        const oppDist = Math.hypot(this.opponentAim.pullScreenX || 0, this.opponentAim.pullScreenY || 0);
        if (oppDist >= 10) {
          const oppDirX = (this.opponentAim.pullScreenX || 0) / oppDist;
          const oppDirY = (this.opponentAim.pullScreenY || 0) / oppDist;
          const oppPower = this.opponentAim.powerRatio || Math.min(1.0, oppDist / this.maxPullDistance);
          const oppElevation = this.renderMode === '3d' ? 26 : 0;
          const oppStart = this.toScreen(oppPiece.x, oppPiece.y, oppElevation);
          const oppLen = 120 + oppPower * 170;
          const oppEnd = {
            x: oppStart.x + oppDirX * oppLen,
            y: oppStart.y + oppDirY * oppLen
          };

          const oppColor = oppPiece.team === 'white' ? '#ffd700' : '#ff4757';
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([7, 9]);
          ctx.lineDashOffset = -(performance.now() * 0.05) % 16;
          ctx.lineWidth = 3.5 + oppPower * 2.0;
          ctx.strokeStyle = oppColor;
          ctx.shadowColor = oppColor;
          ctx.shadowBlur = 14;
          ctx.moveTo(oppStart.x, oppStart.y);
          ctx.lineTo(oppEnd.x, oppEnd.y);
          ctx.stroke();

          // Opponent Arrowhead
          const oppAngle = Math.atan2(oppDirY, oppDirX);
          ctx.beginPath();
          ctx.fillStyle = oppColor;
          ctx.moveTo(oppEnd.x, oppEnd.y);
          ctx.lineTo(oppEnd.x - 14 * Math.cos(oppAngle - 0.4), oppEnd.y - 14 * Math.sin(oppAngle - 0.4));
          ctx.lineTo(oppEnd.x - 14 * Math.cos(oppAngle + 0.4), oppEnd.y - 14 * Math.sin(oppAngle + 0.4));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  /* -------------------------------------------------------------
     Authentic Staunton Vector Piece Renderer
  ------------------------------------------------------------- */
  drawStauntonPiece(ctx, type, team, radius, theme) {
    // 2D Vector Silhouette Mode: Canonical Staunton Shapes matching React Chess Classic
    if (this.renderMode === '2d' && STAUNTON_2D_PATHS[type]) {
      const isWhite = team === 'white';
      const path = new Path2D(STAUNTON_2D_PATHS[type]);
      const pieceScale = (radius * 2.15) / 45;

      ctx.save();

      // Soft ambient ground shadow beneath piece
      ctx.beginPath();
      ctx.ellipse(0, radius * 0.72, radius * 0.78, radius * 0.26, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.fill();

      // Center and scale Staunton vector path
      ctx.scale(pieceScale, pieceScale);
      ctx.translate(-22.5, -22.5);

      // Subtle drop shadow for piece depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = isWhite ? '#ffffff' : '#1e293b';
      ctx.fill(path);

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = isWhite ? '#0f172a' : '#d4af37';
      ctx.lineWidth = 2.4 / pieceScale;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke(path);

      ctx.restore();
      return;
    }

    const isWhite = team === 'white';
    const R = radius;

    let bodyGrad, strokeColor, detailColor, highlightColor;

    if (theme === 'classic' || theme === 'staunton') {
      if (isWhite) {
        // Luxury warm ivory & polished gold
        bodyGrad = ctx.createLinearGradient(-R * 0.4, -R, R * 0.4, R);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.35, '#faf6ea');
        bodyGrad.addColorStop(0.75, '#edd9a3');
        bodyGrad.addColorStop(1, '#bfa048');

        strokeColor = '#5c4815';
        detailColor = 'rgba(92, 72, 21, 0.45)';
        highlightColor = 'rgba(255, 255, 255, 0.75)';
      } else {
        // Polished obsidian onyx & anthracite with crimson rim
        bodyGrad = ctx.createLinearGradient(-R * 0.4, -R, R * 0.4, R);
        bodyGrad.addColorStop(0, '#363e52');
        bodyGrad.addColorStop(0.35, '#1e2330');
        bodyGrad.addColorStop(0.8, '#10131c');
        bodyGrad.addColorStop(1, '#07090e');

        strokeColor = '#ff4757';
        detailColor = 'rgba(255, 71, 87, 0.55)';
        highlightColor = 'rgba(255, 255, 255, 0.4)';
      }
    } else if (theme === 'neo') {
      if (isWhite) {
        // Neo Modernist: Clean titanium white with slate precision outline
        bodyGrad = ctx.createLinearGradient(-R * 0.3, -R, R * 0.3, R);
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(0.5, '#f1f5f9');
        bodyGrad.addColorStop(1, '#cbd5e1');

        strokeColor = '#0f172a';
        detailColor = 'rgba(15, 23, 42, 0.35)';
        highlightColor = 'rgba(255, 255, 255, 0.9)';
      } else {
        // Neo Modernist: Matte dark carbon with gold edge
        bodyGrad = ctx.createLinearGradient(-R * 0.3, -R, R * 0.3, R);
        bodyGrad.addColorStop(0, '#334155');
        bodyGrad.addColorStop(0.6, '#1e293b');
        bodyGrad.addColorStop(1, '#0f172a');

        strokeColor = '#f59e0b';
        detailColor = 'rgba(245, 158, 11, 0.45)';
        highlightColor = 'rgba(245, 158, 11, 0.3)';
      }
    } else if (theme === 'cyber' || theme === 'outline') {
      const neonColor = isWhite ? '#00f3ff' : '#ff007f';
      bodyGrad = isWhite ? 'rgba(0, 243, 255, 0.16)' : 'rgba(255, 0, 127, 0.16)';
      strokeColor = neonColor;
      detailColor = neonColor;
      highlightColor = neonColor;
      ctx.shadowColor = neonColor;
      ctx.shadowBlur = 10;
    } else if (theme === 'crystal' || theme === 'glass') {
      if (isWhite) {
        // Frosted Crystal: Ethereal sapphire diamond glass
        bodyGrad = ctx.createLinearGradient(-R * 0.5, -R, R * 0.5, R);
        bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        bodyGrad.addColorStop(0.4, 'rgba(186, 230, 253, 0.75)');
        bodyGrad.addColorStop(1, 'rgba(56, 189, 248, 0.60)');

        strokeColor = '#38bdf8';
        detailColor = 'rgba(14, 165, 233, 0.4)';
        highlightColor = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
      } else {
        // Dark Smoky Amethyst Quartz
        bodyGrad = ctx.createLinearGradient(-R * 0.5, -R, R * 0.5, R);
        bodyGrad.addColorStop(0, 'rgba(147, 51, 234, 0.85)');
        bodyGrad.addColorStop(0.5, 'rgba(59, 7, 100, 0.80)');
        bodyGrad.addColorStop(1, 'rgba(15, 2, 28, 0.90)');

        strokeColor = '#c084fc';
        detailColor = 'rgba(192, 132, 252, 0.45)';
        highlightColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 8;
      }
    } else { // mono
      bodyGrad = isWhite ? '#ffffff' : '#111827';
      strokeColor = isWhite ? '#000000' : '#ffffff';
      detailColor = strokeColor;
      highlightColor = 'transparent';
    }

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(1.5, R * 0.08);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Contact Drop Shadow beneath piece for realistic depth in 2D
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, R * 0.58, R * 0.78, R * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fill();
    ctx.restore();

    // 1. Multi-Tiered Pedestal Base
    ctx.beginPath();
    ctx.ellipse(0, R * 0.54, R * 0.70, R * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, R * 0.40, R * 0.54, R * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Specific Piece Body Geometry
    switch (type) {
      case 'pawn': {
        // Tapered body
        ctx.beginPath();
        ctx.moveTo(-R * 0.42, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.14, R * 0.10, -R * 0.20, -R * 0.10);
        ctx.lineTo(R * 0.20, -R * 0.10);
        ctx.quadraticCurveTo(R * 0.14, R * 0.10, R * 0.42, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Neck collar ring
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.10, R * 0.26, R * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spherical head
        ctx.beginPath();
        ctx.arc(0, -R * 0.46, R * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Specular gleam on head
        if (theme === 'classic') {
          ctx.beginPath();
          ctx.ellipse(-R * 0.10, -R * 0.56, R * 0.12, R * 0.07, -0.4, 0, Math.PI * 2);
          ctx.fillStyle = highlightColor;
          ctx.fill();
        }
        break;
      }

      case 'rook': {
        // Fortified tower body
        ctx.beginPath();
        ctx.moveTo(-R * 0.46, R * 0.40);
        ctx.lineTo(-R * 0.34, -R * 0.22);
        ctx.lineTo(R * 0.34, -R * 0.22);
        ctx.lineTo(R * 0.46, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cornice ledge
        ctx.beginPath();
        ctx.rect(-R * 0.44, -R * 0.30, R * 0.88, R * 0.08);
        ctx.fill();
        ctx.stroke();

        // Crenellated battlements (4 merlons, 3 embrasures)
        ctx.beginPath();
        ctx.moveTo(-R * 0.44, -R * 0.30);
        ctx.lineTo(-R * 0.44, -R * 0.64);
        ctx.lineTo(-R * 0.24, -R * 0.64);
        ctx.lineTo(-R * 0.24, -R * 0.48);
        ctx.lineTo(-R * 0.10, -R * 0.48);
        ctx.lineTo(-R * 0.10, -R * 0.64);
        ctx.lineTo(R * 0.10, -R * 0.64);
        ctx.lineTo(R * 0.10, -R * 0.48);
        ctx.lineTo(R * 0.24, -R * 0.48);
        ctx.lineTo(R * 0.24, -R * 0.64);
        ctx.lineTo(R * 0.44, -R * 0.64);
        ctx.lineTo(R * 0.44, -R * 0.30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tower arrow-slit window
        ctx.beginPath();
        ctx.rect(-R * 0.06, -R * 0.08, R * 0.12, R * 0.26);
        ctx.fillStyle = detailColor;
        ctx.fill();
        break;
      }

      case 'knight': {
        // Sculpted Staunton equine silhouette
        ctx.beginPath();
        ctx.moveTo(-R * 0.42, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.52, R * 0.05, -R * 0.40, -R * 0.30);
        ctx.lineTo(-R * 0.32, -R * 0.66);
        ctx.lineTo(-R * 0.18, -R * 0.48);
        ctx.quadraticCurveTo(-R * 0.02, -R * 0.62, R * 0.22, -R * 0.40);
        ctx.quadraticCurveTo(R * 0.48, -R * 0.22, R * 0.44, -R * 0.06);
        ctx.lineTo(R * 0.26, -R * 0.02);
        ctx.quadraticCurveTo(R * 0.34, R * 0.12, R * 0.14, R * 0.18);
        ctx.quadraticCurveTo(R * 0.04, R * 0.28, R * 0.38, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye detailing
        ctx.beginPath();
        ctx.arc(R * 0.08, -R * 0.30, R * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = detailColor;
        ctx.fill();

        // Mane notch lines
        ctx.beginPath();
        ctx.moveTo(-R * 0.38, -R * 0.18);
        ctx.lineTo(-R * 0.20, -R * 0.14);
        ctx.moveTo(-R * 0.42, 0);
        ctx.lineTo(-R * 0.24, 0.04);
        ctx.strokeStyle = detailColor;
        ctx.stroke();
        break;
      }

      case 'bishop': {
        // Flared body
        ctx.beginPath();
        ctx.moveTo(-R * 0.44, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.14, R * 0.12, -R * 0.22, -R * 0.08);
        ctx.lineTo(R * 0.22, -R * 0.08);
        ctx.quadraticCurveTo(R * 0.14, R * 0.12, R * 0.44, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Neck collar ring
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.08, R * 0.28, R * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mitre cap
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.44, R * 0.30, R * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mitre diagonal cross-cut notch
        ctx.beginPath();
        ctx.moveTo(R * 0.04, -R * 0.58);
        ctx.lineTo(R * 0.26, -R * 0.36);
        ctx.lineWidth = Math.max(1.8, R * 0.09);
        ctx.strokeStyle = detailColor;
        ctx.stroke();

        // Finial orb at apex
        ctx.beginPath();
        ctx.arc(0, -R * 0.82, R * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = isWhite ? '#ffd700' : '#ff4757';
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'queen': {
        // Elegant hourglass gown
        ctx.beginPath();
        ctx.moveTo(-R * 0.46, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.14, R * 0.12, -R * 0.24, -R * 0.10);
        ctx.lineTo(R * 0.24, -R * 0.10);
        ctx.quadraticCurveTo(R * 0.14, R * 0.12, R * 0.46, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Regal waist band
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.10, R * 0.30, R * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 5-Point Sovereign Coronet
        ctx.beginPath();
        ctx.moveTo(-R * 0.40, -R * 0.10);
        ctx.lineTo(-R * 0.46, -R * 0.54);
        ctx.lineTo(-R * 0.24, -R * 0.30);
        ctx.lineTo(-R * 0.16, -R * 0.64);
        ctx.lineTo(0, -R * 0.32);
        ctx.lineTo(0, -R * 0.72);
        ctx.lineTo(0, -R * 0.32);
        ctx.lineTo(R * 0.16, -R * 0.64);
        ctx.lineTo(R * 0.24, -R * 0.30);
        ctx.lineTo(R * 0.46, -R * 0.54);
        ctx.lineTo(R * 0.40, -R * 0.10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jewels on coronet points
        const pearls = [
          [-R * 0.46, -R * 0.54],
          [-R * 0.16, -R * 0.64],
          [0, -R * 0.72],
          [R * 0.16, -R * 0.64],
          [R * 0.46, -R * 0.54]
        ];
        pearls.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, R * 0.065, 0, Math.PI * 2);
          ctx.fillStyle = isWhite ? '#ffd700' : '#ff4757';
          ctx.fill();
          ctx.stroke();
        });
        break;
      }

      case 'king': {
        // Grand stately mantle
        ctx.beginPath();
        ctx.moveTo(-R * 0.50, R * 0.40);
        ctx.quadraticCurveTo(-R * 0.18, R * 0.12, -R * 0.28, -R * 0.10);
        ctx.lineTo(R * 0.28, -R * 0.10);
        ctx.quadraticCurveTo(R * 0.18, R * 0.12, R * 0.50, R * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Regal collar
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.10, R * 0.34, R * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crown dome
        ctx.beginPath();
        ctx.ellipse(0, -R * 0.38, R * 0.32, R * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crown arch rib lines
        ctx.beginPath();
        ctx.moveTo(-R * 0.22, -R * 0.38);
        ctx.quadraticCurveTo(0, -R * 0.58, R * 0.22, -R * 0.38);
        ctx.strokeStyle = detailColor;
        ctx.stroke();

        // Cross Pattée Finial
        ctx.fillStyle = isWhite ? '#ffd700' : '#ff4757';
        ctx.fillRect(-R * 0.05, -R * 0.88, R * 0.10, R * 0.26);
        ctx.fillRect(-R * 0.15, -R * 0.80, R * 0.30, R * 0.09);
        break;
      }
    }

    ctx.shadowBlur = 0;
  }

  renderPiece(p) {
    if (p.dead) return;
    const ctx = this.ctx;
    const isWhite = p.team === 'white';
    const isSelected = p === this.selectedPiece;

    // 3D elevation height: Lift piece higher when dragged for tactile feedback
    const elevation = this.renderMode === '3d' ? (isSelected && this.isDragging ? 26 : 14) : 0;
    const basePos = this.toScreen(p.x, p.y, 0);
    const screenPos = this.toScreen(p.x, p.y, elevation);

    // Perspective depth scaling in 3D
    const layout = this.getBoardLayout();
    const centerY = this.height / 2;
    const ny = (p.y - centerY) / (layout.boardSize / 2);
    const depthScale = this.renderMode === '3d' ? (1 + ny * 0.18) : 1;

    ctx.save();

    // 3D Cast Shadow on board ground surface
    if (this.renderMode === '3d') {
      ctx.beginPath();
      const shadowRadiusX = p.radius * (isSelected && this.isDragging ? 1.25 : 1.05) * depthScale;
      const shadowRadiusY = p.radius * (isSelected && this.isDragging ? 0.55 : 0.44) * depthScale;
      ctx.ellipse(basePos.x + 1, basePos.y + 3, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = isSelected && this.isDragging ? 'rgba(0, 0, 0, 0.40)' : 'rgba(0, 0, 0, 0.62)';
      ctx.fill();
    } else {
      // 2D subtle ambient contact shadow
      ctx.beginPath();
      ctx.ellipse(screenPos.x, screenPos.y + p.radius * 0.45, p.radius * 0.85, p.radius * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fill();
    }

    // King Fortress Square Wall (Fits the exact Chessboard Tile in 2D and 3D)
    if (p.type === 'king') {
      const isWhiteKing = p.team === 'white';
      const wallColor = isWhiteKing ? '#ffd700' : '#ff4757';
      const wallAura = isWhiteKing ? 'rgba(212, 175, 55, 0.22)' : 'rgba(255, 71, 87, 0.22)';
      const half = p.wallHalf || Math.round(layout.sqSize * 0.47);

      const c1 = this.toScreen(p.x - half, p.y - half, 0);
      const c2 = this.toScreen(p.x + half, p.y - half, 0);
      const c3 = this.toScreen(p.x + half, p.y + half, 0);
      const c4 = this.toScreen(p.x - half, p.y + half, 0);

      const wallHeight = this.renderMode === '3d' ? 14 : 0;
      const t1 = this.toScreen(p.x - half, p.y - half, wallHeight);
      const t2 = this.toScreen(p.x + half, p.y - half, wallHeight);
      const t3 = this.toScreen(p.x + half, p.y + half, wallHeight);
      const t4 = this.toScreen(p.x - half, p.y + half, wallHeight);

      if (p.wallActive && p.wallHp > 0) {
        const wallRatio = Math.max(0, Math.min(1, p.wallHp / p.maxWallHp));
        ctx.save();

        // 1. Interior Citadel Energy Floor (fills the square tile)
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        if (p.wallHitFlash > 0) {
          ctx.fillStyle = isWhiteKing ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 120, 120, 0.65)';
        } else {
          ctx.fillStyle = wallAura;
        }
        ctx.fill();

        // 2. 3D Wall Lateral Faces (Only in 3D mode)
        if (this.renderMode === '3d') {
          // Front Wall Face (c4 -> c3 -> t3 -> t4)
          ctx.beginPath();
          ctx.moveTo(c4.x, c4.y);
          ctx.lineTo(c3.x, c3.y);
          ctx.lineTo(t3.x, t3.y);
          ctx.lineTo(t4.x, t4.y);
          ctx.closePath();
          ctx.fillStyle = isWhiteKing ? 'rgba(212, 175, 55, 0.35)' : 'rgba(255, 71, 87, 0.35)';
          ctx.fill();
          ctx.strokeStyle = p.wallHitFlash > 0 ? '#ffffff' : wallColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Left Wall Face (c1 -> c4 -> t4 -> t1)
          ctx.beginPath();
          ctx.moveTo(c1.x, c1.y);
          ctx.lineTo(c4.x, c4.y);
          ctx.lineTo(t4.x, t4.y);
          ctx.lineTo(t1.x, t1.y);
          ctx.closePath();
          ctx.fillStyle = isWhiteKing ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 71, 87, 0.25)';
          ctx.fill();
          ctx.stroke();

          // Right Wall Face (c2 -> c3 -> t3 -> t2)
          ctx.beginPath();
          ctx.moveTo(c2.x, c2.y);
          ctx.lineTo(c3.x, c3.y);
          ctx.lineTo(t3.x, t3.y);
          ctx.lineTo(t2.x, t2.y);
          ctx.closePath();
          ctx.fillStyle = isWhiteKing ? 'rgba(212, 175, 55, 0.28)' : 'rgba(255, 71, 87, 0.28)';
          ctx.fill();
          ctx.stroke();
        }

        // 3. Fortress Perimeter Top Rim (Primary barrier stroke fitting the square)
        const rimCorners = this.renderMode === '3d' ? [t1, t2, t3, t4] : [c1, c2, c3, c4];
        ctx.beginPath();
        ctx.moveTo(rimCorners[0].x, rimCorners[0].y);
        ctx.lineTo(rimCorners[1].x, rimCorners[1].y);
        ctx.lineTo(rimCorners[2].x, rimCorners[2].y);
        ctx.lineTo(rimCorners[3].x, rimCorners[3].y);
        ctx.closePath();
        ctx.strokeStyle = p.wallHitFlash > 0 ? '#ffffff' : wallColor;
        ctx.lineWidth = Math.max(2.4, 4.2 * wallRatio);
        ctx.shadowColor = wallColor;
        ctx.shadowBlur = p.wallHitFlash > 0 ? 24 : 14;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 4. 4 Corner Bastion Nodes / Towers (at each corner of the chess square)
        rimCorners.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = p.wallHitFlash > 0 ? '#ffffff' : wallColor;
          ctx.shadowColor = wallColor;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          // In 3D, draw vertical corner pylon posts
          if (this.renderMode === '3d') {
            const basePt = [c1, c2, c3, c4][idx];
            ctx.beginPath();
            ctx.moveTo(basePt.x, basePt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.strokeStyle = wallColor;
            ctx.lineWidth = 2.0;
            ctx.stroke();
          }
        });

        // 5. High-Tech Corner Brackets on the perimeter in 2D
        if (this.renderMode === '2d') {
          const bLen = Math.round(half * 0.26);
          ctx.strokeStyle = p.wallHitFlash > 0 ? '#ffffff' : (isWhiteKing ? '#ffffff' : '#ff7675');
          ctx.lineWidth = 2.0;
          // TL
          ctx.beginPath();
          ctx.moveTo(c1.x + bLen, c1.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c1.x, c1.y + bLen);
          // TR
          ctx.moveTo(c2.x - bLen, c2.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c2.x, c2.y + bLen);
          // BR
          ctx.moveTo(c3.x - bLen, c3.y); ctx.lineTo(c3.x, c3.y); ctx.lineTo(c3.x, c3.y - bLen);
          // BL
          ctx.moveTo(c4.x + bLen, c4.y); ctx.lineTo(c4.x, c4.y); ctx.lineTo(c4.x, c4.y - bLen);
          ctx.stroke();
        }

        ctx.restore();
      } else {
        // Wall is Broken: Draw fractured dashed perimeter indicator fitting the square
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255, 71, 87, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    ctx.translate(screenPos.x, screenPos.y);
    if (depthScale !== 1) {
      ctx.scale(depthScale, depthScale);
    }

    // Selection Halo (Smooth Golden Pulse)
    if (isSelected) {
      ctx.beginPath();
      ctx.ellipse(0, p.radius * 0.48, p.radius * 1.05, p.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.8;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Hit Flash
    if (p.hitFlash > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 60, ${p.hitFlash * 0.5})`;
      ctx.fill();
    }

    // Immovable Citadel Base Cornerstone Indicator (or Sovereign Aura if Awakened)
    if (p.type === 'king' && !p.awakened) {
      const isWhiteKing = p.team === 'white';
      ctx.save();
      ctx.strokeStyle = isWhiteKing ? 'rgba(212, 175, 55, 0.45)' : 'rgba(255, 71, 87, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      const baseRy = this.renderMode === '3d' ? p.radius * 0.36 : p.radius * 0.82;
      ctx.beginPath();
      ctx.ellipse(0, this.renderMode === '3d' ? p.radius * 0.52 : 0, p.radius * 0.86, baseRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (p.type === 'king' && p.awakened) {
      // Dynamic Glowing Pulsating Aura for Awakened Sovereign
      const isWhiteKing = p.team === 'white';
      const auraTime = performance.now() / 320;
      const pulse = Math.sin(auraTime) * 3;
      ctx.save();
      ctx.strokeStyle = isWhiteKing ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 71, 87, 0.9)';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = isWhiteKing ? '#ffd700' : '#ff4757';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      const baseRy = this.renderMode === '3d' ? (p.radius + 6 + pulse) * 0.42 : (p.radius + 6 + pulse);
      ctx.ellipse(0, this.renderMode === '3d' ? p.radius * 0.48 : 0, p.radius + 6 + pulse, baseRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw the Master Staunton Vector Silhouette
    this.drawStauntonPiece(ctx, p.type, p.team, p.radius, this.pieceTheme);

    const isHovered = (this.hoveredPiece === p) || isSelected;

    // King Fortress Wall Durability Bar & Status Badge (Shown when hovered, selected, or hit)
    if (p.type === 'king') {
      const isWhiteKing = p.team === 'white';
      if (p.wallActive && p.wallHp > 0) {
        if (isHovered || p.wallHitFlash > 0) {
          const wallRatio = Math.max(0, p.wallHp / p.maxWallHp);
          const wallBarW = p.radius * 2.2;
          const wallBarH = 5;
          const wallBarY = -p.radius * 1.58;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
          ctx.fillRect(-wallBarW / 2, wallBarY, wallBarW, wallBarH);

          const wallGrad = ctx.createLinearGradient(-wallBarW / 2, 0, wallBarW / 2, 0);
          if (isWhiteKing) {
            wallGrad.addColorStop(0, '#ffd700');
            wallGrad.addColorStop(1, '#00e1d9');
          } else {
            wallGrad.addColorStop(0, '#ff4757');
            wallGrad.addColorStop(1, '#ff7675');
          }
          ctx.fillStyle = wallGrad;
          ctx.fillRect(-wallBarW / 2, wallBarY, wallBarW * wallRatio, wallBarH);
          ctx.strokeStyle = isWhiteKing ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 71, 87, 0.8)';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(-wallBarW / 2, wallBarY, wallBarW, wallBarH);

          // Wall Text Badge
          ctx.save();
          ctx.font = `800 ${Math.max(9, Math.round(p.radius * 0.38))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = isWhiteKing ? '#ffd700' : '#ff7675';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 4;
          ctx.fillText(`🛡️ FORTRESS WALL ${Math.round(p.wallHp)}/${p.maxWallHp}`, 0, wallBarY - 2);
          ctx.restore();
        }
      } else if (p.awakened && isHovered) {
        // King is Awakened: Show Majestic Radiant Sovereign Pill
        ctx.save();
        ctx.font = `800 ${Math.max(9, Math.round(p.radius * 0.38))}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = isWhiteKing ? '#ffd700' : '#ff7675';
        ctx.shadowColor = isWhiteKing ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 71, 87, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText(`👑 SOVEREIGN AWAKENED`, 0, -p.radius * 1.55);
        ctx.restore();
      } else if (!p.awakened && isHovered) {
        // Wall is Broken: Show Alert Pill
        ctx.save();
        ctx.font = `800 ${Math.max(9, Math.round(p.radius * 0.36))}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#ff4757';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 5;
        ctx.fillText(`⚠️ CITADEL EXPOSED`, 0, -p.radius * 1.55);
        ctx.restore();
      }
    }

    // Mini Health Bar & Numeric Durability Badge (Only visible on hover/selection per user requirement!)
    if (isHovered) {
      const barW = p.radius * 1.8;
      const barH = 4;
      const barY = -p.radius * 1.25;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(-barW / 2, barY, barW, barH);
      const hpRatio = Math.max(0, Math.min(1, p.hp / p.maxHp));
      ctx.fillStyle = hpRatio > 0.6 ? '#10b981' : (hpRatio > 0.25 ? '#f59e0b' : '#ff3b4e');
      ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-barW / 2, barY, barW, barH);

      // HP Numeric Pill at top-right of piece
      ctx.save();
      ctx.font = `800 ${Math.max(9, Math.round(p.radius * 0.42))}px monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      const hpText = `${Math.round(p.hp)}`;
      const textW = ctx.measureText(hpText).width;
      const pillX = p.radius * 0.95;
      const pillY = -p.radius * 1.15;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(pillX - textW - 4, pillY, textW + 4, 11);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(pillX - textW - 4, pillY, textW + 4, 11);
      ctx.fillStyle = hpRatio > 0.6 ? '#6ee7b7' : (hpRatio > 0.25 ? '#fcd34d' : '#fca5a5');
      ctx.fillText(hpText, pillX - 2, pillY + 1);
      ctx.restore();
    }

    ctx.restore();
  }

  renderVFX() {
    const ctx = this.ctx;

    // Expanding Holographic Shockwaves
    this.shockwaves.forEach((sw) => {
      const pos = this.toScreen(sw.x, sw.y, this.renderMode === '3d' ? 4 : 0);
      ctx.save();
      ctx.beginPath();
      if (this.renderMode === '3d') {
        ctx.ellipse(pos.x, pos.y, sw.radius * 1.08, sw.radius * 0.48, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(pos.x, pos.y, sw.radius, 0, Math.PI * 2);
      }
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.lineWidth = sw.lineWidth;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    });

    // Particles (v3.3.0 theme-aware rendering: stars, nebulae, lightning diamonds, embers)
    this.particles.forEach((p) => {
      const pos = this.toScreen(p.x, p.y, this.renderMode === '3d' ? 8 : 0);
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      
      if (p.shape === 'star') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        const r = p.radius * 1.4;
        ctx.moveTo(pos.x, pos.y - r);
        ctx.quadraticCurveTo(pos.x, pos.y, pos.x + r, pos.y);
        ctx.quadraticCurveTo(pos.x, pos.y, pos.x, pos.y + r);
        ctx.quadraticCurveTo(pos.x, pos.y, pos.x - r, pos.y);
        ctx.quadraticCurveTo(pos.x, pos.y, pos.x, pos.y - r);
        ctx.fill();
      } else if (p.shape === 'nebula') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'lightning') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        const s = p.radius * 1.2;
        ctx.moveTo(pos.x, pos.y - s);
        ctx.lineTo(pos.x + s, pos.y);
        ctx.lineTo(pos.x, pos.y + s);
        ctx.lineTo(pos.x - s, pos.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        if (p.shape === 'ember') {
          ctx.shadowColor = '#ff4500';
          ctx.shadowBlur = 6;
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    // Floating Damage Text
    this.damageNumbers.forEach((dn) => {
      const pos = this.toScreen(dn.x, dn.y, this.renderMode === '3d' ? 14 : 0);
      ctx.save();
      ctx.font = `800 ${dn.size}px Outfit, sans-serif`;
      ctx.fillStyle = dn.color;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, dn.alpha);
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(dn.text, pos.x, pos.y);
      ctx.restore();
    });
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const elapsed = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    try {
      // Update Turn Timer Ring
      if (!this.isGameOver) {
        const ring = document.getElementById('turnTimerRing');
        if (ring) {
          if (!this.turnStartTime) this.turnStartTime = timestamp;
          const elapsedTurn = (timestamp - this.turnStartTime) / 1000;
          const budget = this.turnBudget || 45;
          const remaining = Math.max(0, budget - elapsedTurn);
          const frac = remaining / budget;
          ring.style.strokeDashoffset = (97.4 * (1 - frac)) + 'px';
          if (remaining <= 5) {
            ring.setAttribute('class', 'turn-timer-circle critical');
          } else if (remaining <= 12) {
            ring.setAttribute('class', 'turn-timer-circle warning');
          } else {
            ring.setAttribute('class', 'turn-timer-circle');
          }
        }
      }

      this.ctx.save();
      if (this.screenShake > 0) {
        const sx = (Math.random() - 0.5) * this.screenShake;
        const sy = (Math.random() - 0.5) * this.screenShake;
        this.ctx.translate(sx, sy);
      }

      // Fixed-timestep 60Hz physics accumulator (deterministic simulation across 30Hz - 144Hz)
      this.physicsAccumulator = (this.physicsAccumulator || 0) + elapsed;
      const fixedDt = 1 / 60;
      let subSteps = 0;
      while (this.physicsAccumulator >= fixedDt && subSteps < 5) {
        this.updatePhysics(fixedDt);
        this.physicsAccumulator -= fixedDt;
        subSteps++;
      }
      if (subSteps >= 5) {
        this.physicsAccumulator = 0;
      }

      if (this.renderMode === '3d' && this.engine3d) {
        this.engine3d.update(elapsed);
        this.engine3d.render();
      } else {
        this.renderBoard();
        this.renderTrajectory();

        // Sort pieces by Y for proper 3D depth layering (dragged piece on top)
        const sortedPieces = [...this.pieces].sort((a, b) => {
          if (a === this.selectedPiece && this.isDragging) return 1;
          if (b === this.selectedPiece && this.isDragging) return -1;
          return a.y - b.y;
        });
        sortedPieces.forEach(p => this.renderPiece(p));

        this.renderVFX();
      }
      this.ctx.restore();
    } catch (err) {
      console.error('Arena render loop error:', err);
    }

    this._rAFId = requestAnimationFrame(this._boundLoop || this.loop.bind(this));
  }

  /**
   * Cleanup method to prevent memory leaks on page navigation.
   * Cancels rAF, removes global event listeners, and stops audio drones.
   */
  destroy() {
    if (this._rAFId) {
      cancelAnimationFrame(this._rAFId);
      this._rAFId = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.audio) {
      this.audio.stopSuddenDeathDrone();
    }
    clearTimeout(this.botTimeout);
    clearTimeout(this.botAimTimeout);
    this._paused = true;
  }
}

// Global expose
window.ArchessArena = ArchessArena;
