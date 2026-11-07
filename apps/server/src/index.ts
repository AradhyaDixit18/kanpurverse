/** KanpurVerse multiplayer server — WebSocket, server-authoritative. Run: npm run dev:server (or tsx src/index.ts). */
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { C2S, PROTOCOL_VERSION, DEFAULT_APPEARANCE, SHOP_ITEMS, isValidName, type S2C } from "@kanpurverse/shared";
import { CONFIG } from "./config";
import { log } from "./log";
import { issueToken, verifyToken, newUid } from "./auth";
import { openStorage, type PlayerDoc, type Storage } from "./storage";
import { Room, Player } from "./room";

const MSG_WINDOW_MS = 1000, MSG_MAX_PER_WINDOW = 60, MAX_MSG_BYTES = 4096;

export async function startServer(opts: { port?: number; storage?: Storage } = {}) {
  const storage = opts.storage ?? await openStorage();
  const rooms = new Map<string, Room>();
  const ipCount = new Map<string, number>();
  const getRoom = (name: string) => { let r = rooms.get(name); if (!r) { r = new Room(name, storage, CONFIG.maxPlayersPerRoom); rooms.set(name, r); } return r; };

  const http = createServer((req, res) => {
    const url = req.url ?? "/";
    res.setHeader("Access-Control-Allow-Origin", CONFIG.allowedOrigins.includes(req.headers.origin ?? "") ? req.headers.origin! : CONFIG.allowedOrigins[0]);
    if (url === "/health") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: true, protocol: PROTOCOL_VERSION, storage: storage.kind, rooms: [...rooms.values()].map(r => ({ name: r.name, players: r.players.size })), uptime: process.uptime() })); }
    if (url.startsWith("/leaderboard")) { storage.leaderboard(20).then(lb => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(lb)); }); return; }
    res.writeHead(404); res.end();
  });
  const wss = new WebSocketServer({ server: http, maxPayload: MAX_MSG_BYTES, verifyClient: (info, cb) => {
    const origin = info.origin ?? ""; const ok = !origin || CONFIG.allowedOrigins.includes(origin) || CONFIG.allowedOrigins.includes("*");
    if (!ok) log.warn("origin rejected", { origin }); cb(ok, 403, "origin");
  } });

  wss.on("connection", (ws: WebSocket, req) => {
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.socket.remoteAddress || "?";
    const n = (ipCount.get(ip) ?? 0) + 1; ipCount.set(ip, n);
    if (n > CONFIG.maxConnectionsPerIp) { ws.close(4001, "too many connections"); ipCount.set(ip, n - 1); return; }
    let player: Player | undefined; let room: Room | undefined; const times: number[] = [];
    const send = (m: S2C) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m)); };
    const helloTimer = setTimeout(() => { if (!player) ws.close(4002, "no hello"); }, 10_000);

    ws.on("message", async (data) => {
      const now = Date.now(); while (times.length && now - times[0] > MSG_WINDOW_MS) times.shift(); times.push(now);
      if (times.length > MSG_MAX_PER_WINDOW) { ws.close(4004, "flood"); return; }
      let msg: unknown; try { msg = JSON.parse(data.toString()); } catch { return send({ t: "error", code: "bad_json", message: "Invalid JSON" }); }
      const parsed = C2S.safeParse(msg);
      if (!parsed.success) return send({ t: "error", code: "bad_msg", message: "Invalid message" });
      const m = parsed.data;
      try {
        if (m.t === "ping") return send({ t: "pong", at: m.at, serverTime: now });
        if (m.t === "hello") {
          if (player) return;
          clearTimeout(helloTimer);
          const sess = verifyToken(m.token);
          let doc = sess ? await storage.getPlayer(sess.uid) : null;
          if (doc?.bannedUntil && doc.bannedUntil > now) { send({ t: "error", code: "banned", message: "Temporarily banned" }); return ws.close(4005, "banned"); }
          if (!doc) {
            const name = m.guestName ?? `Guest${Math.floor(1000 + Math.random() * 9000)}`;
            const v = isValidName(name); if (!v.ok) return send({ t: "error", code: "bad_name", message: v.reason! });
            doc = { _id: newUid(), name, appearance: m.appearance ?? DEFAULT_APPEARANCE, lang: m.lang ?? "kanpuriya", level: 1, xp: 0, coins: 200, missionsCompleted: [], unlocked: [], friends: [], blocked: [], playtimeSec: 0, createdAt: now, lastSeenAt: now, reports: 0 };
            await storage.putPlayer(doc);
          } else { if (m.appearance) doc.appearance = m.appearance; if (m.lang) doc.lang = m.lang; }
          // one connection per account: kick the older one
          for (const r of rooms.values()) { const dup = r.players.get(doc._id); if (dup) { dup.send({ t: "error", code: "replaced", message: "Signed in elsewhere" }); dup.ws.close(4006, "replaced"); } }
          player = new Player(ws, doc);
          return send({ t: "welcome", id: player.id, token: issueToken(player.id), name: player.name, profile: player.profile, serverTime: now });
        }
        if (!player) return send({ t: "error", code: "no_hello", message: "Send hello first" });
        if (m.t === "join") {
          if (room) room.leave(player);
          const r = getRoom(m.room.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "kanpur-1");
          if (r.full) return send({ t: "error", code: "full", message: "Room is full, try another" });
          room = r; r.join(player); return;
        }
        if (!room) return send({ t: "error", code: "no_room", message: "Join a room first" });
        switch (m.t) {
          case "state": return room.onState(player, m.p, m.ry, m.anim, m.seq);
          case "chat": return room.chat(player, m.text);
          case "emote": return room.emote(player, m.anim);
          case "vehicle.enter": return room.enterVehicle(player, m.id, m.seat);
          case "vehicle.exit": return room.exitVehicle(player);
          case "vehicle.state": return room.vehicleState(player, m.id, m.p, m.q, m.v);
          case "mission.start": return room.startMission(player, m.id);
          case "mission.checkpoint": return room.checkpoint(player, m.id, m.index);
          case "mission.abandon": return room.abandon(player);
          case "profile.update": { if (m.appearance) player.appearance = m.appearance; if (m.lang) player.lang = m.lang; player.profile.appearance = player.appearance; player.profile.lang = player.lang; room.persist(player); return send({ t: "profile", profile: player.profile }); }
          case "social": return room.social(player, m.action, m.target, m.reason);
          case "shop.buy": return room.buy(player, m.item, SHOP_ITEMS);
        }
      } catch (e) { log.error("handler error", { e: String(e), t: (m as { t: string }).t }); send({ t: "error", code: "internal", message: "Server error" }); }
    });
    ws.on("close", () => { clearTimeout(helloTimer); ipCount.set(ip, Math.max(0, (ipCount.get(ip) ?? 1) - 1)); if (player && room) { room.leave(player); if (room.isEmpty()) { room.destroy(); rooms.delete(room.name); } } });
    ws.on("error", (e) => log.warn("ws error", { e: String(e) }));
  });

  const port = opts.port ?? CONFIG.port;
  await new Promise<void>(res => http.listen(port, CONFIG.host, res));
  log.info("KanpurVerse server listening", { port, origins: CONFIG.allowedOrigins, storage: storage.kind });
  const close = async () => { for (const r of rooms.values()) { for (const p of r.players.values()) p.ws.close(1001, "shutdown"); r.destroy(); } wss.close(); http.close(); await storage.close(); };
  return { http, wss, rooms, storage, port, close };
}

if (process.argv[1] && /index\.ts$|index\.js$/.test(process.argv[1]) && !process.env.KV_NO_AUTOSTART) {
  startServer().then(s => { const stop = async () => { log.info("shutting down"); await s.close(); process.exit(0); }; process.on("SIGINT", stop); process.on("SIGTERM", stop); })
    .catch(e => { log.error("fatal", { e: String(e) }); process.exit(1); });
}
