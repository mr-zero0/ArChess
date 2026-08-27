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
      try { const result = await fn(); write("debug", "FUNCTION_END", { name, durationMs: Math.round(performance.now()-begin) }); return result; }
      catch (error) { write("error", "FUNCTION_ERROR", { name, durationMs: Math.round(performance.now()-begin), error: safe(error) }); if (typeof fallback === "function") return fallback(error); return fallback; }
    },
  };
  window.ArChessObservability = Object.freeze(api);
  window.ArChessLog = (event, data) => api.info(event, data);

  window.addEventListener("error", e => api.error("UNCAUGHT_ERROR", e.error || new Error(e.message), { source:e.filename, line:e.lineno, column:e.colno }));
  window.addEventListener("unhandledrejection", e => api.error("UNHANDLED_REJECTION", e.reason));

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "unknown";
    const method = (init.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase();
    const begin = performance.now(); write("debug", "FETCH_START", { method, url });
    try { const response = await originalFetch(input, init); write("debug", "FETCH_END", { method, url, status:response.status, durationMs:Math.round(performance.now()-begin) }); return response; }
    catch (error) { api.error("FETCH_ERROR", error, { method, url, durationMs:Math.round(performance.now()-begin) }); throw error; }
  };

  // Automatically instrument ArChess-owned global controllers. This gives function-level
  // telemetry for legacy modules without forcing every module to duplicate boilerplate.
  const targets = ["UI","Physics","PieceFactory","ThemeManager","PrefsManager","AudioManager","GameModeManager","MatchHistory","ChallengeManager","ReplayRecorder","ReplayViewer","TutorialManager","TuningPanel","BoardSizeManager","GuestIdentity"];
  const wrapped = new WeakSet();
  const instrument = (name, value) => {
    if (!value || wrapped.has(value) || Object.isFrozen(value)) return;
    if (typeof value !== "object" && typeof value !== "function") return;
    wrapped.add(value);
    for (const key of Object.keys(value)) {
      let original;
      try { original = value[key]; } catch (_) { continue; }
      if (typeof original !== "function" || original.__archessWrapped) continue;
      const wrappedFn = function(...args) {
        const begin = performance.now(); write("debug", "FUNCTION_START", { name:`${name}.${key}` });
        try { const result = original.apply(this, args); if (result?.then) return result.then(v=>{write("debug","FUNCTION_END",{name:`${name}.${key}`,durationMs:Math.round(performance.now()-begin)});return v}).catch(e=>{api.error("FUNCTION_ERROR",e,{name:`${name}.${key}`});throw e}); write("debug","FUNCTION_END",{name:`${name}.${key}`,durationMs:Math.round(performance.now()-begin)}); return result; }
        catch (error) { api.error("FUNCTION_ERROR", error, { name:`${name}.${key}` }); throw error; }
      };
      Object.defineProperty(wrappedFn, "__archessWrapped", { value:true });
      try { value[key] = wrappedFn; } catch (_) { /* frozen/non-writable property */ }
    }
  };
  const scan = () => targets.forEach(name => instrument(name, window[name]));
  window.addEventListener("DOMContentLoaded", scan, { once:true });
  setTimeout(scan, 1000);

  window.addEventListener("DOMContentLoaded", () => api.info("DOM_READY", { path:location.pathname }));
  window.addEventListener("load", () => api.info("WINDOW_READY", { durationMs:Math.round(performance.now()-started) }));
})();
