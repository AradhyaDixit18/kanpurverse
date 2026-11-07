/** Server-authoritative room: player registry, movement validation, vehicles, missions, economy, chat, social. */
import type { WebSocket } from "ws";
import {
  type S2C, type PlayerSnapshot, type VehicleSnapshot, type PlayerProfile, type AnimState, type Vec3, type Appearance, type Language,
  MAX_PLAYER_SPEED, MAX_VEHICLE_SPEED, VEHICLE_SPAWNS, MISSIONS, SPAWN_POINT, WORLD_SIZE, TICK_RATE,
  maskProfanity, stripPII, hasBlockedWord, levelFromXp,
} from "@kanpurverse/shared";
import type { Storage, PlayerDoc } from "./storage";
import { log } from "./log";

const IST_OFFSET_MS = 5.5 * 3600 * 1000; // Kanpur is UTC+5:30, no DST
const TELEPORT_TOLERANCE = 2.5;   // metres of slack per check on top of max speed
const CHAT_WINDOW_MS = 10_000, CHAT_MAX_PER_WINDOW = 5;

export interface MissionRun { id: string; index: number; startedAt: number; lastCheckpointAt: number; partner?: string; sitStart?: number }

export class Player {
  id: string; name: string; p: Vec3 = [...SPAWN_POINT] as Vec3; ry = 0; anim: AnimState = "idle"; appearance: Appearance; lang: Language;
  vehicle?: string; seat?: "driver" | "passenger"; lastStateAt = 0; lastSeq = -1; profile: PlayerProfile; doc: PlayerDoc;
  chatTimes: number[] = []; muted = new Set<string>(); mission?: MissionRun; party: Set<string> = new Set(); violations = 0; joinedAt = Date.now();
  lastChat: string[] = []; invites = new Set<string>();
  constructor(public ws: WebSocket, doc: PlayerDoc) {
    this.id = doc._id; this.name = doc.name; this.appearance = doc.appearance; this.lang = doc.lang; this.doc = doc;
    this.profile = { name: doc.name, appearance: doc.appearance, lang: doc.lang, level: doc.level, xp: doc.xp, coins: doc.coins, missionsCompleted: doc.missionsCompleted, unlocked: doc.unlocked, friends: doc.friends, blocked: doc.blocked, playtimeSec: doc.playtimeSec };
  }
  send(m: S2C) { if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(m)); }
  snapshot(): PlayerSnapshot { return { id: this.id, name: this.name, p: this.p, ry: this.ry, anim: this.anim, appearance: this.appearance, vehicle: this.vehicle, seat: this.seat, level: this.profile.level }; }
}

interface Vehicle extends VehicleSnapshot { lastAt: number; home: Vec3; homeRy: number }

export class Room {
  players = new Map<string, Player>();
  vehicles = new Map<string, Vehicle>();
  private tick?: NodeJS.Timeout; private createdAt = Date.now();
  constructor(public name: string, private storage: Storage, private maxPlayers: number) {
    for (const v of VEHICLE_SPAWNS) {
      const q = yawToQuat(v.ry); const p: Vec3 = [v.p[0], 0.6, v.p[1]];
      this.vehicles.set(v.id, { id: v.id, kind: v.kind, p, q, v: 0, lastAt: 0, home: p, homeRy: v.ry });
    }
    this.tick = setInterval(() => this.broadcastSnapshot(), 1000 / TICK_RATE);
  }
  /** World clock = real Kanpur (IST) time of day, 0..1. Day/night in the game matches the actual sky over Kanpur. */
  get time() { return ((Date.now() + IST_OFFSET_MS) % 86400000) / 86400000; }
  get full() { return this.players.size >= this.maxPlayers; }
  isEmpty() { return this.players.size === 0; }
  destroy() { if (this.tick) clearInterval(this.tick); }

  broadcast(m: S2C, except?: string) { const s = JSON.stringify(m); for (const p of this.players.values()) if (p.id !== except && p.ws.readyState === p.ws.OPEN) p.ws.send(s); }
  private broadcastSnapshot() {
    if (!this.players.size) return;
    const players = [...this.players.values()].map(p => p.snapshot());
    const vehicles = [...this.vehicles.values()].map(({ lastAt: _a, home: _h, homeRy: _r, ...v }) => v);
    const time = this.time;
    for (const p of this.players.values()) p.send({ t: "snapshot", time, players, vehicles, ack: p.lastSeq });
  }

  join(pl: Player) {
    this.players.set(pl.id, pl);
    pl.send({ t: "joined", room: this.name, players: [...this.players.values()].map(p => p.snapshot()), vehicles: [...this.vehicles.values()].map(({ lastAt: _a, home: _h, homeRy: _r, ...v }) => v), time: this.time });
    this.broadcast({ t: "player.join", player: pl.snapshot() }, pl.id);
    log.info("join", { room: this.name, id: pl.id, name: pl.name, n: this.players.size });
  }
  leave(pl: Player) {
    if (pl.vehicle) this.exitVehicle(pl);
    for (const m of pl.party) this.players.get(m)?.party.delete(pl.id);
    this.players.delete(pl.id);
    this.broadcast({ t: "player.leave", id: pl.id });
    pl.doc.playtimeSec += Math.round((Date.now() - pl.joinedAt) / 1000); pl.doc.lastSeenAt = Date.now();
    this.persist(pl);
    log.info("leave", { room: this.name, id: pl.id, n: this.players.size });
  }
  persist(pl: Player) {
    Object.assign(pl.doc, { name: pl.name, appearance: pl.appearance, lang: pl.lang, level: pl.profile.level, xp: pl.profile.xp, coins: pl.profile.coins,
      missionsCompleted: pl.profile.missionsCompleted, unlocked: pl.profile.unlocked, friends: pl.profile.friends, blocked: pl.profile.blocked, playtimeSec: pl.doc.playtimeSec });
    this.storage.putPlayer(pl.doc).catch(e => log.error("persist failed", { e: String(e) }));
  }

  /** Movement validation: speed cap per elapsed time, world bounds, sane Y. Rejections snap the client back. */
  onState(pl: Player, p: Vec3, ry: number, anim: AnimState, seq: number) {
    if (seq <= pl.lastSeq) return; pl.lastSeq = seq;
    const now = Date.now(); const dt = pl.lastStateAt ? Math.min(2, (now - pl.lastStateAt) / 1000) : 0.05; pl.lastStateAt = now;
    if (pl.vehicle && pl.seat === "driver") { const v = this.vehicles.get(pl.vehicle)!; pl.p = [...v.p] as Vec3; pl.ry = ry; pl.anim = "drive"; return; }
    if (pl.vehicle && pl.seat === "passenger") { const v = this.vehicles.get(pl.vehicle)!; pl.p = [...v.p] as Vec3; pl.anim = "sit"; return; }
    const half = WORLD_SIZE / 2 + 5;
    if (!p.every(Number.isFinite) || Math.abs(p[0]) > half || Math.abs(p[2]) > half || p[1] < -5 || p[1] > 80) return this.reject(pl, "bounds");
    const d = Math.hypot(p[0] - pl.p[0], p[2] - pl.p[2]);
    if (d > MAX_PLAYER_SPEED * dt + TELEPORT_TOLERANCE) return this.reject(pl, "speed");
    pl.p = p; pl.ry = ry; pl.anim = anim;
    this.checkMissionProgress(pl);
  }
  private reject(pl: Player, why: string) {
    pl.violations++;
    pl.send({ t: "snapshot", time: this.time, players: [pl.snapshot()], vehicles: [], ack: pl.lastSeq });
    if (pl.violations % 20 === 0) log.warn("movement rejections", { id: pl.id, why, n: pl.violations });
  }

  chat(pl: Player, raw: string) {
    const now = Date.now(); pl.chatTimes = pl.chatTimes.filter(t => now - t < CHAT_WINDOW_MS);
    if (pl.chatTimes.length >= CHAT_MAX_PER_WINDOW) return pl.send({ t: "error", code: "rate", message: "Slow down a little." });
    pl.chatTimes.push(now);
    const text = maskProfanity(stripPII(raw.trim())).slice(0, 160);
    if (!text) return;
    pl.lastChat.push(text); if (pl.lastChat.length > 10) pl.lastChat.shift();
    const msg: S2C = { t: "chat", from: pl.id, name: pl.name, text, at: now };
    for (const other of this.players.values()) {
      if (other.muted.has(pl.id) || other.profile.blocked.includes(pl.id) || pl.profile.blocked.includes(other.id)) continue;
      if (Math.hypot(other.p[0] - pl.p[0], other.p[2] - pl.p[2]) > 120 && other.id !== pl.id && !pl.party.has(other.id)) continue; // proximity chat + party
      other.send(msg);
    }
  }
  emote(pl: Player, anim: AnimState) { if (anim === "dance" && !pl.profile.unlocked.includes("emote_dance")) return pl.send({ t: "error", code: "locked", message: "Dance emote is locked. Buy it at Naveen Market." }); pl.anim = anim; this.broadcast({ t: "emote", id: pl.id, anim }); }

  enterVehicle(pl: Player, id: string, seat: "driver" | "passenger") {
    const v = this.vehicles.get(id); if (!v) return pl.send({ t: "error", code: "no_vehicle", message: "No such vehicle" });
    if (pl.vehicle) this.exitVehicle(pl);
    if (Math.hypot(v.p[0] - pl.p[0], v.p[2] - pl.p[2]) > 6) return pl.send({ t: "error", code: "too_far", message: "Get closer to the vehicle" });
    if (seat === "driver" && v.driver) return pl.send({ t: "error", code: "occupied", message: "Someone's already driving" });
    if (seat === "passenger" && (v.passenger || v.kind === "bike" && v.passenger)) return pl.send({ t: "error", code: "occupied", message: "Seat taken" });
    if (seat === "driver") v.driver = pl.id; else v.passenger = pl.id;
    pl.vehicle = id; pl.seat = seat; pl.anim = seat === "driver" ? "drive" : "sit";
    this.broadcast({ t: "vehicle.update", vehicle: stripV(v) });
  }
  exitVehicle(pl: Player) {
    const v = pl.vehicle ? this.vehicles.get(pl.vehicle) : undefined; if (!v) return;
    if (v.driver === pl.id) { v.driver = undefined; v.v = 0; } if (v.passenger === pl.id) v.passenger = undefined;
    pl.vehicle = undefined; pl.seat = undefined; pl.anim = "idle";
    pl.p = [v.p[0] + 2.2 * Math.cos(quatYaw(v.q)), 1, v.p[2] - 2.2 * Math.sin(quatYaw(v.q))]; pl.lastStateAt = Date.now();
    this.broadcast({ t: "vehicle.update", vehicle: stripV(v) });
  }
  vehicleState(pl: Player, id: string, p: Vec3, q: [number, number, number, number], speed: number) {
    const v = this.vehicles.get(id); if (!v || v.driver !== pl.id) return;
    const now = Date.now(); const dt = v.lastAt ? Math.min(2, (now - v.lastAt) / 1000) : 0.05; v.lastAt = now;
    const half = WORLD_SIZE / 2 + 5;
    if (!p.every(Number.isFinite) || Math.abs(p[0]) > half || Math.abs(p[2]) > half || p[1] < -5 || p[1] > 60) return;
    if (Math.hypot(p[0] - v.p[0], p[2] - v.p[2]) > MAX_VEHICLE_SPEED * dt + TELEPORT_TOLERANCE) return pl.send({ t: "vehicle.update", vehicle: stripV(v) });
    v.p = p; v.q = q; v.v = Math.min(Math.abs(speed), MAX_VEHICLE_SPEED); pl.p = [...p] as Vec3;
    const pass = v.passenger ? this.players.get(v.passenger) : undefined; if (pass) pass.p = [...p] as Vec3;
    this.checkMissionProgress(pl);
  }

  /** Missions: server tracks checkpoints by actual validated position; client only announces intent. */
  startMission(pl: Player, id: string) {
    const def = MISSIONS.find(m => m.id === id); if (!def) return pl.send({ t: "error", code: "no_mission", message: "Unknown mission" });
    if (pl.mission) return pl.send({ t: "error", code: "busy", message: "Finish or abandon your current mission first" });
    if (Math.hypot(def.start[0] - pl.p[0], def.start[1] - pl.p[2]) > 14) return pl.send({ t: "error", code: "too_far", message: "Go to the mission giver first" });
    if (def.needsVehicle && !pl.vehicle) return pl.send({ t: "error", code: "need_vehicle", message: "This one needs a vehicle" });
    pl.mission = { id, index: 0, startedAt: Date.now(), lastCheckpointAt: Date.now() };
    pl.send({ t: "mission.update", id, status: "started", index: 0 });
  }
  checkpoint(pl: Player, id: string, index: number) { // explicit (photo/sit) checkpoints; movement ones are automatic
    const m = pl.mission; if (!m || m.id !== id || m.index !== index) return;
    const def = MISSIONS.find(d => d.id === id)!; const cp = def.checkpoints[index];
    if (Math.hypot(cp[0] - pl.p[0], cp[1] - pl.p[2]) > def.radius + 2) return pl.send({ t: "error", code: "too_far", message: "Not at the checkpoint yet" });
    if (def.kind === "social") {
      const partner = [...this.players.values()].find(o => o.id !== pl.id && Math.hypot(o.p[0] - pl.p[0], o.p[2] - pl.p[2]) < 4);
      if (!partner) return pl.send({ t: "toast", text: "Bring a friend to the table first.", kind: "info" });
      if (!m.sitStart) { m.sitStart = Date.now(); m.partner = partner.id; return pl.send({ t: "toast", text: "Sit for 60 seconds together…", kind: "info" }); }
      if (Date.now() - m.sitStart < 60_000) return pl.send({ t: "toast", text: `${Math.ceil((60_000 - (Date.now() - m.sitStart)) / 1000)}s more…`, kind: "info" });
    }
    this.advance(pl, def);
  }
  abandon(pl: Player) { const m = pl.mission; if (!m) return; pl.mission = undefined; pl.send({ t: "mission.update", id: m.id, status: "failed" }); }
  private checkMissionProgress(pl: Player) {
    const m = pl.mission; if (!m) return; const def = MISSIONS.find(d => d.id === m.id)!;
    if (def.timeLimitSec && Date.now() - m.startedAt > def.timeLimitSec * 1000) { pl.mission = undefined; pl.send({ t: "mission.update", id: m.id, status: "failed" }); this.storage.addMissionLog({ uid: pl.id, mission: m.id, status: "failed", durationSec: def.timeLimitSec, at: Date.now() }); return; }
    if (def.kind === "photo" || def.kind === "social") return; // explicit
    if (def.needsVehicle && !pl.vehicle) return;
    const cp = def.checkpoints[m.index];
    if (Math.hypot(cp[0] - pl.p[0], cp[1] - pl.p[2]) <= def.radius) {
      if (Date.now() - m.lastCheckpointAt < 400) return; // can't hit two checkpoints in <0.4s
      this.advance(pl, def);
    }
  }
  private advance(pl: Player, def: (typeof MISSIONS)[number]) {
    const m = pl.mission!; m.index++; m.lastCheckpointAt = Date.now();
    if (m.index < def.checkpoints.length) return pl.send({ t: "mission.update", id: def.id, status: "checkpoint", index: m.index });
    const first = !pl.profile.missionsCompleted.includes(def.id);
    const reward = first ? def.reward : { coins: Math.round(def.reward.coins * 0.4), xp: Math.round(def.reward.xp * 0.4) };
    pl.profile.coins += reward.coins; pl.profile.xp += reward.xp; pl.profile.level = levelFromXp(pl.profile.xp);
    if (first) pl.profile.missionsCompleted.push(def.id);
    pl.mission = undefined;
    pl.send({ t: "mission.update", id: def.id, status: "completed", reward }); pl.send({ t: "profile", profile: pl.profile });
    this.storage.addMissionLog({ uid: pl.id, mission: def.id, status: "completed", durationSec: Math.round((Date.now() - m.startedAt) / 1000), at: Date.now() });
    this.persist(pl);
    if (def.coop) for (const mate of pl.party) { const o = this.players.get(mate); if (o && Math.hypot(o.p[0] - pl.p[0], o.p[2] - pl.p[2]) < 30) { const r = { coins: Math.round(reward.coins / 2), xp: Math.round(reward.xp / 2) }; o.profile.coins += r.coins; o.profile.xp += r.xp; o.profile.level = levelFromXp(o.profile.xp); o.send({ t: "toast", text: `Party bonus from ${pl.name}: +${r.coins} coins`, kind: "reward" }); o.send({ t: "profile", profile: o.profile }); this.persist(o); } }
  }

  buy(pl: Player, itemId: string, items: { id: string; price: number; slot: string; value: number }[]) {
    const it = items.find(i => i.id === itemId); if (!it) return pl.send({ t: "error", code: "no_item", message: "Unknown item" });
    if (pl.profile.unlocked.includes(it.id)) return pl.send({ t: "error", code: "owned", message: "Already owned" });
    if (pl.profile.coins < it.price) return pl.send({ t: "error", code: "coins", message: "Not enough coins" });
    pl.profile.coins -= it.price; pl.profile.unlocked.push(it.id); pl.send({ t: "profile", profile: pl.profile }); pl.send({ t: "toast", text: "Purchased!", kind: "reward" }); this.persist(pl);
  }

  social(pl: Player, action: string, target: string, reason?: string) {
    const o = this.players.get(target);
    switch (action) {
      case "friend.add": if (o && !pl.profile.friends.includes(target)) { pl.profile.friends.push(target); o.send({ t: "social", event: "friend.added", from: pl.id, name: pl.name }); pl.send({ t: "profile", profile: pl.profile }); this.persist(pl); } break;
      case "friend.remove": pl.profile.friends = pl.profile.friends.filter(f => f !== target); pl.send({ t: "profile", profile: pl.profile }); this.persist(pl); break;
      case "block": if (!pl.profile.blocked.includes(target)) pl.profile.blocked.push(target); pl.muted.add(target); pl.send({ t: "profile", profile: pl.profile }); this.persist(pl); break;
      case "unblock": pl.profile.blocked = pl.profile.blocked.filter(b => b !== target); pl.muted.delete(target); pl.send({ t: "profile", profile: pl.profile }); this.persist(pl); break;
      case "mute": pl.muted.add(target); break;
      case "unmute": pl.muted.delete(target); break;
      case "report": { if (!o) return; o.doc.reports++; this.storage.addReport({ from: pl.id, target, reason: reason ?? "", at: Date.now(), chatContext: o.lastChat.slice(-5) }); pl.send({ t: "toast", text: "Report filed. Thank you.", kind: "info" });
        if (o.doc.reports >= 5 && hasBlockedWord(o.lastChat.join(" "))) { o.send({ t: "error", code: "kicked", message: "Removed for abusive chat." }); o.ws.close(4003, "abuse"); } break; }
      case "party.invite": if (o && !o.profile.blocked.includes(pl.id)) { o.invites.add(pl.id); o.send({ t: "social", event: "party.invite", from: pl.id, name: pl.name }); } break;
      case "party.accept": if (o && pl.invites.has(target)) { pl.invites.delete(target); const members = new Set([...o.party, o.id, pl.id]); for (const m of members) { const mp = this.players.get(m); if (mp) { mp.party = new Set([...members].filter(x => x !== m)); mp.send({ t: "social", event: "party.update", party: [...members] }); } } } break;
      case "party.leave": { const members = [...pl.party]; for (const m of members) { const mp = this.players.get(m); if (mp) { mp.party.delete(pl.id); mp.send({ t: "social", event: "party.update", party: [...mp.party, mp.id] }); } } pl.party.clear(); pl.send({ t: "social", event: "party.update", party: [pl.id] }); break; }
    }
  }
}

function yawToQuat(y: number): [number, number, number, number] { return [0, Math.sin(y / 2), 0, Math.cos(y / 2)]; }
function quatYaw(q: [number, number, number, number]) { return Math.atan2(2 * (q[3] * q[1] + q[0] * q[2]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])); }
function stripV(v: Vehicle): VehicleSnapshot { const { lastAt: _a, home: _h, homeRy: _r, ...s } = v; return s; }
