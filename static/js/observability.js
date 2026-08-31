(() => {
  "use strict";
  if (window.ArChessObservability) return;

  const started = performance.now();
  const safe = (value) => {
    try {
      if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
      return JSON.parse(JSON.stringify(value));
    } catch (_) { return String(value); }
  };
  const write = (level, event, data = {}) => {
    const payload = { t: Math.round(performance.now() - started), event, ...data };
    (console[level] || console.log).call(console, `[ArChess] ${event}`, payload);
    window.dispatchEvent(new CustomEvent("archess:log", { detail: payload }));
  };
  const api = {
    debug: (event, data) => write("debug", event, data),
    info: (event, data) => write("info", event, data),
    warn: (event, data) => write("warn", event, data),
    error: (event, error, data = {}) => write("error", event, { ...data, error: safe(error) }),
    async guard(name, fn, fallback) {
      const begin = performance.now(); write("debug", "FUNCTION_START", { name });
      try {
        const result = await fn();
        write("debug", "FUNCTION_END", { name, durationMs: Math.round(performance.now() - begin) });
        return result;
      } catch (error) {
        write("error", "FUNCTION_ERROR", { name, durationMs: Math.round(performance.now() - begin), error: safe(error) });
        if (typeof fallback === "function") return fallback(error);
        return fallback;
      }
    },
  };
  window.ArChessObservability = Object.freeze(api);
  window.ArChessLog = (event, data) => api.info(event, data);

  window.addEventListener("error", (e) => api.error("UNCAUGHT_ERROR", e.error || new Error(e.message), { source: e.filename, line: e.lineno, column: e.colno }));
  window.addEventListener("unhandledrejection", (e) => api.error("UNHANDLED_REJECTION", e.reason));

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "unknown";
    const method = (init.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase();
    const begin = performance.now(); write("debug", "FETCH_START", { method, url });
    try {
      const response = await originalFetch(input, init);
      write("debug", "FETCH_END", { method, url, status: response.status, durationMs: Math.round(performance.now() - begin) });
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

  const instrumentObject = (name, value) => {
    if (!value || wrappedObjects.has(value) || Object.isFrozen(value)) return;
    if (typeof value !== "object" && typeof value !== "function") return;
    wrappedObjects.add(value);
    for (const key of Object.keys(value)) {
      let original;
      try { original = value[key]; } catch (_) { continue; }
      if (typeof original !== "function") continue;
      const wrappedFn = wrapFunction(`${name}.${key}`, original);
      try { value[key] = wrappedFn; } catch (_) {}
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
      const wrappedFn = wrapFunction(`${name}.${key}`, original);
      try { proto[key] = wrappedFn; wrappedMethods.add(wrappedFn); } catch (_) {}
    }
  };

  function wrapFunction(name, original) {
    const wrappedFn = function (...args) {
      const begin = performance.now();
      write("debug", "FUNCTION_START", { name });
      try {
        const result = original.apply(this, args);
        if (result?.then) {
          return result.then((value) => {
            write("debug", "FUNCTION_END", { name, durationMs: Math.round(performance.now() - begin) });
            return value;
          }).catch((error) => {
            api.error("FUNCTION_ERROR", error, { name, durationMs: Math.round(performance.now() - begin) });
            throw error;
          });
        }
        write("debug", "FUNCTION_END", { name, durationMs: Math.round(performance.now() - begin) });
        return result;
      } catch (error) {
        api.error("FUNCTION_ERROR", error, { name, durationMs: Math.round(performance.now() - begin) });
        throw error;
      }
    };
    Object.defineProperty(wrappedFn, "name", { value: original.name || name, configurable: true });
    return wrappedFn;
  }

  const scan = () => {
    targets.forEach((name) => instrumentObject(name, window[name]));
    prototypes.forEach((name) => instrumentPrototype(name, window[name]));
  };

  window.addEventListener("DOMContentLoaded", scan, { once: true });
  setTimeout(scan, 1000);
  setTimeout(scan, 2500);

  window.addEventListener("DOMContentLoaded", () => api.info("DOM_READY", { path: location.pathname }));
  window.addEventListener("load", () => api.info("WINDOW_READY", { durationMs: Math.round(performance.now() - started) }));
})();
