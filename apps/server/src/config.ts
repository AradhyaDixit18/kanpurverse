export const CONFIG = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? "0.0.0.0",
  mongoUri: process.env.MONGODB_URI ?? "",
  mongoDb: process.env.MONGODB_DB ?? "kanpurverse",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map(s => s.trim()).filter(Boolean),
  maxPlayersPerRoom: Number(process.env.MAX_PLAYERS_PER_ROOM ?? 32),
  maxConnectionsPerIp: Number(process.env.MAX_CONN_PER_IP ?? 6),
  dataDir: process.env.DATA_DIR ?? new URL("../data/", import.meta.url).pathname,
  logLevel: process.env.LOG_LEVEL ?? "info",
};
