(() => {
  "use strict";
  if (window.ArChessObservability) return;

  const started = performance.now();
  const originalConsole = {
    debug: console.debug?.bind(console) || console.log.bind(console),
    info: console.info?.bind(console) || console.log.bind(console),
    warn: console.warn?.bind(console) || console.log.bind(console),
    error: console.error?.bind(console) || console.log.bind(console),
    log: console.log.bind(console),
  };
  let capturingConsole = false;
  let lastRequestId = null;
  const correlationId = (() => {
    try {
      const key = "archess.correlationId";
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;
      const value = globalThis.crypto?.randomUUID?.() || `corr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(key, value);
      return value;
    } catch (_) {
      return `corr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  })();

  const queue = [];
  let flushTimer = null;
  const originalFetch = window.fetch.bind(window);

  const safe = (value) => {
    try {
      if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
      return JSON.parse(JSON.stringify(value));
    } catch (_) { return String(value); }
  };

  const enrich = (level, event, data = {}) => ({
    t: Math.round(performance.now() - started),
    timestamp: new Date().toISOString(),
    level,
    event,
    source: "browser",
    path: location.pathname,
    correlationId,
    requestId: data.requestId || lastRequestId || null,
    gameId: window.gameState?.gameId || null,
    roomId: window.ArChessMultiplayer?.roomCode || null,
    ...data,
  });

  const scheduleFlush = () => {
    if (flushTimer !== null) return;
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      void flush(false);
    }, 250);
  };

  async function flush(immediate = false) {
    if (!queue.length) return;
    const events = queue.splice(0, 50);
    try {
      await originalFetch("/api/observability/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ArChess-Correlation-ID": correlationId },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch (_) {
      if (!immediate && queue.length < 100) queue.unshift(...events.slice(-10));
    }
  }

  function write(level, event, data = {}) {
    const payload = enrich(level, event, data);
    originalConsole[level === "log" ? "log" : level]("[ArChess]", event, payload);
    window.dispatchEvent(new CustomEvent("archess:log", { detail: payload }));
    queue.push(payload);
    if (level === "error" || level === "warn") void flush(true);
    else scheduleFlush();
  }

  const api = {
    debug: (event, data) => write("debug", event, data),
    info: (event, data) => write("info", event, data),
    warn: (event, data) => write("warn", event, data),
    error: (event, error, data = {}) => write("error", event, { ...data, error: safe(error) }),
    async guard(name, fn, fallback) {
      const begin = performance.now();
      write("debug", "FUNCTION_START", { function: name });
      try {
        const result = await fn();
        write("debug", "FUNCTION_END", { function: name, durationMs: Math.round(performance.now() - begin) });
        return result;
      } catch (error) {
        write("error", "FUNCTION_ERROR", { function: name, durationMs: Math.round(performance.now() - begin), error: safe(error) });
        if (typeof fallback === "function") return fallback(error);
        return fallback;
      }
    },
    flush: () => flush(true),
    correlationId,
  };

  window.ArChessObservability = Object.freeze(api);
  window.ArChessLog = (event, data) => api.info(event, data);

  ["debug", "info", "warn", "error"].forEach((level) => {
    console[level] = (...args) => {
      originalConsole[level](...args);
      if (capturingConsole) return;
      capturingConsole = true;
      try {
        const error = level === "error" ? args.find((value) => value instanceof Error) : null;
        write(level, "CONSOLE_EVENT", { consoleArgs: args.map(safe), error: safe(error) });
      } finally {
        capturingConsole = false;
      }
    };
  });

  window.addEventListener("error", (e) => api.error("UNCAUGHT_ERROR", e.error || new Error(e.message), {
    sourceFile: e.filename,
    function: "window.onerror",
    line: e.lineno,
    column: e.colno,
  }));
  window.addEventListener("unhandledrejection", (e) => api.error("UNHANDLED_REJECTION", e.reason, { function: "window.onunhandledrejection" }));
  window.addEventListener("securitypolicyviolation", (e) => api.error("CSP_VIOLATION", new Error(e.violatedDirective), {
    blockedUri: e.blockedURI,
    documentUri: e.documentURI,
    sourceFile: e.sourceFile,
    line: e.lineNumber,
  }));

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "unknown";
    const method = (init.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase();
    const begin = performance.now();
    write("debug", "FETCH_START", { method, url });
    try {
      const response = await originalFetch(input, init);
      lastRequestId = response.headers.get("X-ArChess-Request-ID") || lastRequestId;
      write("debug", "FETCH_END", {
        method,
        url,
        status: response.status,
        requestId: response.headers.get("X-ArChess-Request-ID") || null,
        durationMs: Math.round(performance.now() - begin),
      });
      if (!response.ok) write("warn", "FETCH_HTTP_ERROR", { method, url, status: response.status });
      return response;
    } catch (error) {
      api.error("FETCH_ERROR", error, { method, url, durationMs: Math.round(performance.now() - begin) });
      throw error;
    }
  };

  const targets = [
    "UI", "Physics", "PieceFactory", "ThemeManager", "PrefsManager", "AudioManager",
    "GameModeManager", "MatchHistory", "ChallengeManager", "ReplayRecorder", "ReplayViewer",
    "TutorialManager", "TuningPanel", "BoardSizeManager", "GuestIdentity"
  ];
  const prototypes = ["GameBoard", "GameRenderer", "InputController"];
  const wrappedObjects = new WeakSet();
  const wrappedMethods = new WeakSet();

  function wrapFunction(name, original) {
    const wrappedFn = function (...args) {
      const begin = performance.now();
      write("debug", "FUNCTION_START", { function: name });
      try {
        const result = original.apply(this, args);
        if (result?.then) {
          return result.then((value) => {
            write("debug", "FUNCTION_END", { function: name, durationMs: Math.round(performance.now() - begin) });
            return value;
          }).catch((error) => {
            api.error("FUNCTION_ERROR", error, { function: name, durationMs: Math.round(performance.now() - begin) });
            throw error;
          });
        }
        write("debug", "FUNCTION_END", { function: name, durationMs: Math.round(performance.now() - begin) });
        return result;
      } catch (error) {
        api.error("FUNCTION_ERROR", error, { function: name, durationMs: Math.round(performance.now() - begin) });
        throw error;
      }
    };
    Object.defineProperty(wrappedFn, "name", { value: original.name || name, configurable: true });
    return wrappedFn;
  }

  const instrumentObject = (name, value) => {
    if (!value || wrappedObjects.has(value)) return;
    if (typeof value !== "object" && typeof value !== "function") return;
    wrappedObjects.add(value);

    if (Object.isFrozen(value)) {
      const facade = {};
      Object.keys(value).forEach((key) => {
        const original = value[key];
        facade[key] = typeof original === "function" ? wrapFunction(`${name}.${key}`, original) : original;
      });
      try { window[name] = facade; } catch (_) {}
      return;
    }

    for (const key of Object.keys(value)) {
      let original;
      try { original = value[key]; } catch (_) { continue; }
      if (typeof original !== "function") continue;
      try { value[key] = wrapFunction(`${name}.${key}`, original); } catch (_) {}
    }
  };

  const instrumentPrototype = (name, ctor) => {
    if (!ctor?.prototype) return;
    const proto = ctor.prototype;
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === "constructor") continue;
      let original;
      try { original = proto[key]; } catch (_) { continue; }
      if (typeof original !== "function" || wrappedMethods.has(original)) continue;
      try {
        const wrapped = wrapFunction(`${name}.${key}`, original);
        proto[key] = wrapped;
        wrappedMethods.add(wrapped);
      } catch (_) {}
    }
  };

  const scan = () => {
    targets.forEach((name) => instrumentObject(name, window[name]));
    prototypes.forEach((name) => instrumentPrototype(name, window[name]));
  };

  let lastState = "";
  const observeGameState = () => {
    const game = window.gameState;
    if (!game) return;
    const moving = Array.isArray(game.pieces) ? game.pieces.filter((piece) => piece.alive && piece.moving).length : 0;
    const stateObject = {
      phase: game.phase,
      currentPlayer: game.currentPlayer,
      moving,
      activeCollisions: game.activeCollisions?.size || 0,
      selectedPiece: game.selectedPiece?.id || null,
      collisionCount: game.collisionCount || 0,
      settleBucket: Math.floor(Number(game.settledFor || 0) * 10) / 10,
      gameOver: !!game.gameOver,
    };
    const state = JSON.stringify(stateObject);
    if (state !== lastState) {
      lastState = state;
      write("debug", "GAME_STATE_TRANSITION", { state: stateObject });
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    scan();
    api.info("DOM_READY", { path: location.pathname });
    [...document.scripts].forEach((script) => api.debug("SCRIPT_LOADED", { sourceFile: script.src || "inline" }));
  }, { once: true });
  window.addEventListener("load", () => api.info("WINDOW_READY", { durationMs: Math.round(performance.now() - started) }));
  window.addEventListener("beforeunload", () => { void flush(true); });
  window.addEventListener("pagehide", () => { void flush(true); });
  window.setInterval(observeGameState, 100);
  window.setTimeout(scan, 1000);
  window.setTimeout(scan, 2500);
})();
