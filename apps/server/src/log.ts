import { CONFIG } from "./config";
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type L = keyof typeof LEVELS;
const min = LEVELS[(CONFIG.logLevel as L) in LEVELS ? (CONFIG.logLevel as L) : "info"];
function emit(level: L, msg: string, data?: Record<string, unknown>) {
  if (LEVELS[level] < min) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...data });
  (level === "error" ? console.error : console.log)(line);
}
export const log = { debug: (m: string, d?: Record<string, unknown>) => emit("debug", m, d), info: (m: string, d?: Record<string, unknown>) => emit("info", m, d),
  warn: (m: string, d?: Record<string, unknown>) => emit("warn", m, d), error: (m: string, d?: Record<string, unknown>) => emit("error", m, d) };
