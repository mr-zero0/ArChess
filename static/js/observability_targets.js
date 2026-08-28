(() => {
  "use strict";
  if (window.__ArChessObservabilityTargetsLoaded) return;
  window.__ArChessObservabilityTargetsLoaded = true;

  const log = window.ArChessObservability || {
    debug: () => {},
    error: () => {},
  };

  const MODULES = Object.freeze({
    UI: "static/js/ui.js",
    Physics: "static/js/physics.js",
    PieceFactory: "static/js/pieces.js",
    ThemeManager: "static/js/theme.js",
    PrefsManager: "static/js/prefs.js",
    AudioManager: "static/js/audio.js",
    GameModeManager: "static/js/mode.js",
    MatchHistory: "static/js/match_history.js",
    ChallengeManager: "static/js/challenges.js",
    ReplayRecorder: "static/js/replay.js",
    ReplayViewer: "static/js/replay.js",
    TutorialManager: "static/js/tutorial.js",
    GuestIdentity: "static/js/identity.js",
    AuthGate: "static/js/auth_gate.js",
    ProgressionUI: "static/js/progression_ui.js",
    RankedUI: "static/js/ranked_ui.js",
    ChessboardUI: "static/js/chessboard_ui.js",
    BoardSizeManager: "static/js/board_size.js",
    TuningPanel: "static/js/tuning.js",
    GameBoard: "static/js/board.js",
    GameRenderer: "static/js/renderer_2d.js",
    InputController: "static/js/input.js",
  });

  const wrappedFunctions = new WeakSet();

  const safeClone = (value) => {
    try {
      if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return String(value);
    }
  };

  const wrap = (qualifiedName, sourceFile, original) => {
    if (typeof original !== "function" || wrappedFunctions.has(original)) return original;
    const wrapped = function (...args) {
      const started = performance.now();
      log.debug("FUNCTION_START", {
        function: qualifiedName,
        sourceFile,
      });
      try {
        const result = original.apply(this, args);
        if (result && typeof result.then === "function") {
          return result.then((value) => {
            log.debug("FUNCTION_END", {
              function: qualifiedName,
              sourceFile,
              durationMs: Math.round(performance.now() - started),
            });
            return value;
          }).catch((error) => {
            log.error("FUNCTION_ERROR", error, {
              function: qualifiedName,
              sourceFile,
              durationMs: Math.round(performance.now() - started),
            });
            throw error;
          });
        }
        log.debug("FUNCTION_END", {
          function: qualifiedName,
          sourceFile,
          durationMs: Math.round(performance.now() - started),
        });
        return result;
      } catch (error) {
        log.error("FUNCTION_ERROR", error, {
          function: qualifiedName,
          sourceFile,
          durationMs: Math.round(performance.now() - started),
        });
        throw error;
      }
    };
    try {
      Object.defineProperty(wrapped, "name", { value: original.name || qualifiedName, configurable: true });
      Object.defineProperty(wrapped, "__archessInstrumented", { value: true, configurable: false });
    } catch (_) {}
    wrappedFunctions.add(wrapped);
    return wrapped;
  };

  function instrumentObject(name, value, sourceFile) {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return;

    if (Object.isFrozen(value)) {
      const facade = {};
      let changed = false;
      for (const key of Object.keys(value)) {
        let member;
        try { member = value[key]; } catch (_) { continue; }
        if (typeof member === "function") {
          facade[key] = wrap(`${name}.${key}`, sourceFile, member);
          changed = true;
        } else {
          facade[key] = member;
        }
      }
      if (changed) {
        try { window[name] = facade; } catch (_) {}
      }
      return;
    }

    for (const key of Object.keys(value)) {
      let member;
      try { member = value[key]; } catch (_) { continue; }
      if (typeof member !== "function" || member.__archessInstrumented) continue;
      try { value[key] = wrap(`${name}.${key}`, sourceFile, member); } catch (_) {}
    }
  }

  function instrumentPrototype(name, ctor, sourceFile) {
    if (!ctor?.prototype) return;
    for (const key of Object.getOwnPropertyNames(ctor.prototype)) {
      if (key === "constructor") continue;
      let member;
      try { member = ctor.prototype[key]; } catch (_) { continue; }
      if (typeof member !== "function" || member.__archessInstrumented) continue;
      try { ctor.prototype[key] = wrap(`${name}.${key}`, sourceFile, member); } catch (_) {}
    }
  }

  function scan() {
    for (const [name, sourceFile] of Object.entries(MODULES)) {
      const value = window[name];
      instrumentObject(name, value, sourceFile);
      instrumentPrototype(name, value, sourceFile);
    }
  }

  window.ArChessObservabilityModules = MODULES;
  window.setTimeout(scan, 0);
  window.addEventListener("DOMContentLoaded", scan, { once: true });
  window.setTimeout(scan, 500);
  window.setTimeout(scan, 1500);
  window.setTimeout(scan, 3000);
  log.debug("OBSERVABILITY_MODULE_MAP_READY", {
    moduleCount: Object.keys(MODULES).length,
    modules: Object.keys(MODULES),
  });
})();
