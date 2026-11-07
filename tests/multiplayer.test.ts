/** Two real WebSocket clients against a real server instance: join, see each other, move, chat, vehicle, mission, anti-cheat. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import WebSocket from "ws";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.KV_NO_AUTOSTART = "1";
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "kv-"));
process.env.ALLOWED_ORIGINS = "*";
const { startServer } = await import("../apps/server/src/index");

type Msg = Record<string, any>;
class Client {
  ws!: WebSocket; inbox: Msg[] = []; id = ""; token = ""; seq = 0;
  constructor(private port: number) {}
  connect() { return new Promise<void>((res, rej) => { this.ws = new WebSocket(`ws://127.0.0.1:${this.port}`); this.ws.on("open", res); this.ws.on("error", rej); this.ws.on("message", d => this.inbox.push(JSON.parse(d.toString()))); }); }
  send(m: Msg) { this.ws.send(JSON.stringify(m)); }
  async wait(pred: (m: Msg) => boolean, ms = 3000): Promise<Msg> {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const i = this.inbox.findIndex(pred); if (i >= 0) return this.inbox.splice(i, 1)[0]; await new Promise(r => setTimeout(r, 10)); }
    throw new Error("timeout waiting for " + pred.toString());
  }
  async hello(name: string, token?: string) { this.send({ t: "hello", v: 1, guestName: name, token }); const w = await this.wait(m => m.t === "welcome"); this.id = w.id; this.token = w.token; return w; }
  state(p: [number, number, number], anim = "walk") { this.send({ t: "state", p, ry: 0, anim, seq: ++this.seq }); }
  /** Walk in ≤2.5 m steps every 100 ms (well inside the 9 m/s server cap). */
  async walk(to: [number, number], from?: [number, number]) {
    let [x, z] = from ?? this.pos; const d = Math.hypot(to[0] - x, to[1] - z); const n = Math.max(1, Math.ceil(d / 2.5));
    for (let i = 1; i <= n; i++) { const px = x + (to[0] - x) * i / n, pz = z + (to[1] - z) * i / n; this.state([px, 1, pz]); await new Promise(r => setTimeout(r, 100)); }
    this.pos = to;
  }
  pos: [number, number] = [-10, 14];
  close() { this.ws.close(); }
}

let srv: Awaited<ReturnType<typeof startServer>>; let port: number;
beforeAll(async () => { srv = await startServer({ port: 0 }); port = (srv.http.address() as { port: number }).port; });
afterAll(async () => { await srv.close(); });

describe("multiplayer", () => {
  it("two clients join the same room and see each other", async () => {
    const a = new Client(port), b = new Client(port);
    await a.connect(); await b.connect();
    const wa = await a.hello("Rad"); expect(wa.profile.coins).toBe(200);
    await b.hello("Priya");
    a.send({ t: "join", room: "kanpur-1" }); const ja = await a.wait(m => m.t === "joined"); expect(ja.players.map((p: Msg) => p.name)).toEqual(["Rad"]); expect(ja.vehicles.length).toBeGreaterThan(5);
    b.send({ t: "join", room: "kanpur-1" }); const jb = await b.wait(m => m.t === "joined"); expect(jb.players.map((p: Msg) => p.name).sort()).toEqual(["Priya", "Rad"]);
    const pj = await a.wait(m => m.t === "player.join"); expect(pj.player.name).toBe("Priya");
    // movement propagates through snapshots
    a.state([-8, 1, 14]);
    const snap = await b.wait(m => m.t === "snapshot" && m.players.some((p: Msg) => p.name === "Rad" && p.p[0] === -8));
    expect(snap.players.length).toBe(2);
    // chat
    b.send({ t: "chat", text: "Ka ho bhaiya 9876543210 http://x.y" });
    const c = await a.wait(m => m.t === "chat"); expect(c.name).toBe("Priya"); expect(c.text).toBe("Ka ho bhaiya [number removed] [link removed]");
    // profanity masking
    b.send({ t: "chat", text: "tu chutiya hai" }); const c2 = await a.wait(m => m.t === "chat"); expect(c2.text).not.toContain("chutiya");
    // leave
    b.close(); const lv = await a.wait(m => m.t === "player.leave"); expect(lv.id).toBe(b.id);
    a.close();
  });

  it("rejects teleport and keeps authoritative position", async () => {
    const a = new Client(port); await a.connect(); await a.hello("Cheater"); a.send({ t: "join", room: "anti" }); await a.wait(m => m.t === "joined");
    a.inbox.length = 0;
    a.state([200, 1, 200]);  // 280 m in one tick
    const snap = await a.wait(m => m.t === "snapshot" && m.players.length === 1);
    expect(Math.abs(snap.players[0].p[0] - -10)).toBeLessThan(0.01);
    a.close();
  });

  it("vehicle claim is exclusive; passenger seat works", async () => {
    const a = new Client(port), b = new Client(port); await a.connect(); await b.connect(); await a.hello("Driver"); await b.hello("Rider");
    a.send({ t: "join", room: "veh" }); await a.wait(m => m.t === "joined"); b.send({ t: "join", room: "veh" }); await b.wait(m => m.t === "joined");
    // walk to the auto at (44,10) in small steps (<= 9 m/s)
    await Promise.all([a.walk([42, 12]), b.walk([42, 11])]);
    a.send({ t: "vehicle.enter", id: "v_auto_1", seat: "driver" }); const vu = await a.wait(m => m.t === "vehicle.update"); expect(vu.vehicle.driver).toBe(a.id);
    b.send({ t: "vehicle.enter", id: "v_auto_1", seat: "driver" }); const err = await b.wait(m => m.t === "error"); expect(err.code).toBe("occupied");
    b.send({ t: "vehicle.enter", id: "v_auto_1", seat: "passenger" }); const vu2 = await b.wait(m => m.t === "vehicle.update" && m.vehicle.passenger === b.id); expect(vu2.vehicle.driver).toBe(a.id);
    a.send({ t: "vehicle.state", id: "v_auto_1", p: [46, 0.6, 10], q: [0, 0, 0, 1], v: 5 });
    const s = await b.wait(m => m.t === "snapshot" && m.vehicles.some((v: Msg) => v.id === "v_auto_1" && v.p[0] === 46));
    expect(s.players.find((p: Msg) => p.id === b.id).p[0]).toBe(46); // passenger moves with the vehicle
    a.send({ t: "vehicle.exit" }); await a.wait(m => m.t === "vehicle.update" && !m.vehicle.driver);
    a.close(); b.close();
  });

  it("mission completes on the server and pays once at full rate; token reconnect restores profile", async () => {
    const a = new Client(port); await a.connect(); const w = await a.hello("Runner"); a.send({ t: "join", room: "mis" }); await a.wait(m => m.t === "joined");
    a.send({ t: "mission.start", id: "tut_walk" }); const st = await a.wait(m => m.t === "mission.update"); expect(st.status).toBe("started");
    await a.walk([-30, 24]); await a.walk([0, -20]);
    const cp = await a.wait(m => m.t === "mission.update" && m.status === "checkpoint"); expect(cp.index).toBe(1);
    await a.wait(m => m.t === "mission.update" && m.status === "checkpoint" && m.index === 2);
    await a.walk([-62, -92]);
    const done = await a.wait(m => m.t === "mission.update" && m.status === "completed"); expect(done.reward).toEqual({ coins: 100, xp: 50 });
    const prof = await a.wait(m => m.t === "profile"); expect(prof.profile.coins).toBe(300); expect(prof.profile.missionsCompleted).toEqual(["tut_walk"]);
    // checkpoint spoofing: can't claim checkpoint from far away
    a.send({ t: "mission.start", id: "race_mall" }); const e = await a.wait(m => m.t === "error"); expect(e.code).toBe("too_far");
    // shop
    a.send({ t: "shop.buy", item: "acc_shades" }); const p2 = await a.wait(m => m.t === "profile"); expect(p2.profile.coins).toBe(100); expect(p2.profile.unlocked).toContain("acc_shades");
    a.send({ t: "shop.buy", item: "top_jacket" }); const e2 = await a.wait(m => m.t === "error"); expect(e2.code).toBe("coins");
    a.close(); await new Promise(r => setTimeout(r, 100));
    const b = new Client(port); await b.connect(); const w2 = await b.hello("ignored", w.token); expect(w2.id).toBe(w.id); expect(w2.profile.coins).toBe(100); expect(w2.name).toBe("Runner");
    b.close();
  });

  it("rejects malformed messages, bad names and flood", async () => {
    const a = new Client(port); await a.connect();
    a.send({ t: "hello", v: 1, guestName: "ad" }); let e = await a.wait(m => m.t === "error"); expect(e.code).toBe("bad_msg");
    a.send({ t: "hello", v: 1, guestName: "admin_x" }); e = await a.wait(m => m.t === "error"); expect(e.code).toBe("bad_name");
    a.send({ t: "nonsense" }); e = await a.wait(m => m.t === "error"); expect(e.code).toBe("bad_msg");
    a.send({ t: "chat", text: "hi" }); e = await a.wait(m => m.t === "error"); expect(e.code).toBe("no_hello");
    const closed = new Promise<number>(res => a.ws.on("close", code => res(code)));
    for (let i = 0; i < 80; i++) a.send({ t: "ping", at: i });
    expect(await closed).toBe(4004);
  });
});
