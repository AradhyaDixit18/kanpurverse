/** Persistence: MongoDB Atlas when MONGODB_URI is set, otherwise a JSON file store (dev / offline). Same interface. */
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { CONFIG } from "./config";
import { log } from "./log";
import type { PlayerProfile } from "@kanpurverse/shared";

export interface PlayerDoc extends PlayerProfile { _id: string; createdAt: number; lastSeenAt: number; bannedUntil?: number; reports: number }
export interface ReportDoc { from: string; target: string; reason: string; at: number; chatContext: string[] }
export interface MissionLog { uid: string; mission: string; status: "completed" | "failed"; durationSec: number; at: number }

export interface Storage {
  kind: "mongo" | "file";
  getPlayer(uid: string): Promise<PlayerDoc | null>;
  putPlayer(doc: PlayerDoc): Promise<void>;
  addReport(r: ReportDoc): Promise<void>;
  addMissionLog(m: MissionLog): Promise<void>;
  leaderboard(limit: number): Promise<{ name: string; xp: number; level: number }[]>;
  close(): Promise<void>;
}

class FileStorage implements Storage {
  kind = "file" as const;
  private players = new Map<string, PlayerDoc>();
  private reports: ReportDoc[] = []; private missions: MissionLog[] = [];
  private dirty = false; private file: string; private timer: NodeJS.Timeout;
  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "kanpurverse.json");
    if (existsSync(this.file)) {
      try { const d = JSON.parse(readFileSync(this.file, "utf8")); for (const p of d.players ?? []) this.players.set(p._id, p); this.reports = d.reports ?? []; this.missions = d.missions ?? []; }
      catch (e) { log.error("file store corrupt, starting empty", { e: String(e) }); }
    }
    this.timer = setInterval(() => this.flush(), 5000);
  }
  private flush() { if (!this.dirty) return; this.dirty = false;
    const tmp = this.file + ".tmp"; writeFileSync(tmp, JSON.stringify({ players: [...this.players.values()], reports: this.reports.slice(-2000), missions: this.missions.slice(-5000) })); renameSync(tmp, this.file); }
  async getPlayer(uid: string) { return this.players.get(uid) ?? null; }
  async putPlayer(doc: PlayerDoc) { this.players.set(doc._id, doc); this.dirty = true; }
  async addReport(r: ReportDoc) { this.reports.push(r); this.dirty = true; }
  async addMissionLog(m: MissionLog) { this.missions.push(m); this.dirty = true; }
  async leaderboard(limit: number) { return [...this.players.values()].sort((a, b) => b.xp - a.xp).slice(0, limit).map(p => ({ name: p.name, xp: p.xp, level: p.level })); }
  async close() { clearInterval(this.timer); this.flush(); }
}

class MongoStorage implements Storage {
  kind = "mongo" as const;
  private constructor(private client: import("mongodb").MongoClient, private db: import("mongodb").Db) {}
  static async connect(uri: string, dbName: string) {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    const db = client.db(dbName);
    await db.collection("players").createIndex({ xp: -1 });
    await db.collection("players").createIndex({ name: 1 });
    await db.collection("reports").createIndex({ target: 1, at: -1 });
    await db.collection("mission_logs").createIndex({ uid: 1, at: -1 });
    await db.collection("mission_logs").createIndex({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
    return new MongoStorage(client, db);
  }
  async getPlayer(uid: string) { return (await this.db.collection<PlayerDoc>("players").findOne({ _id: uid })) ?? null; }
  async putPlayer(doc: PlayerDoc) { await this.db.collection<PlayerDoc>("players").replaceOne({ _id: doc._id }, doc, { upsert: true }); }
  async addReport(r: ReportDoc) { await this.db.collection<ReportDoc>("reports").insertOne(r); }
  async addMissionLog(m: MissionLog) { await this.db.collection<MissionLog>("mission_logs").insertOne(m); }
  async leaderboard(limit: number) { return (await this.db.collection<PlayerDoc>("players").find({}, { projection: { name: 1, xp: 1, level: 1 } }).sort({ xp: -1 }).limit(limit).toArray()).map(p => ({ name: p.name, xp: p.xp, level: p.level })); }
  async close() { await this.client.close(); }
}

export async function openStorage(): Promise<Storage> {
  if (CONFIG.mongoUri) {
    try { const s = await MongoStorage.connect(CONFIG.mongoUri, CONFIG.mongoDb); log.info("storage: MongoDB", { db: CONFIG.mongoDb }); return s; }
    catch (e) { log.error("MongoDB connect failed; falling back to file store", { e: String(e) }); }
  }
  log.info("storage: file", { dir: CONFIG.dataDir });
  return new FileStorage(CONFIG.dataDir);
}
