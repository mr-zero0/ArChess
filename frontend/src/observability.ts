export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|set-cookie/i;
const CLIENT_CORRELATION_ID = globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function sanitize(fields: LogFields): LogFields {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

export function createLogger(scope: string) {
  const write = (level: LogLevel, message: string, fields: LogFields = {}) => {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      correlation_id: CLIENT_CORRELATION_ID,
      ...sanitize(fields),
    };

    const method = console[level] ?? console.log;
    method.call(console, JSON.stringify(payload));
  };

  return {
    debug: (message: string, fields?: LogFields) => write("debug", message, fields),
    info: (message: string, fields?: LogFields) => write("info", message, fields),
    warn: (message: string, fields?: LogFields) => write("warn", message, fields),
    error: (message: string, fields?: LogFields) => write("error", message, fields),
  };
}
