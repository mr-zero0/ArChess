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

  function write(level, event, data = {}) {
    const payload = { t: Math.round(performance.now() - started), event, ...data };
    const fn = console[level] || console.log;
    fn.call(console, `[ArChess] ${event}`, payload);
    window.dispatchEvent(new CustomEvent("archess:log", { detail: payload }));
  }

  const api = {
    debug(event, data) { write("debug", event, data); },
    info(event, data) { write("info", event, data); },
    warn(event, data) { write("warn", event, data); },
    error(event, error, data = {}) { write("error", event, { ...data, error: safe(error) }); },
    async guard(name, fn, fallback) {
      const begin = performance.now();
      write("debug", "FUNCTION_START", { name });
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

  window.addEventListener("error", (event) => {
    api.error("UNCAUGHT_ERROR", event.error || new Error(event.message), { source: event.filename, line: event.lineno, column: event.colno });
  });
  window.addEventListener("unhandledrejection", (event) => api.error("UNHANDLED_REJECTION", event.reason));

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "unknown";
    const method = (init.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase();
    const begin = performance.now();
    api.debug("FETCH_START", { method, url });
    try {
      const response = await originalFetch(input, init);
      api.debug("FETCH_END", { method, url, status: response.status, durationMs: Math.round(performance.now() - begin) });
      return response;
    } catch (error) {
      api.error("FETCH_ERROR", error, { method, url, durationMs: Math.round(performance.now() - begin) });
      throw error;
    }
  };

  window.addEventListener("DOMContentLoaded", () => api.info("DOM_READY", { path: location.pathname }));
  window.addEventListener("load", () => api.info("WINDOW_READY", { durationMs: Math.round(performance.now() - started) }));
})();
