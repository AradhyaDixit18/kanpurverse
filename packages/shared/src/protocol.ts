/** Wire protocol between game client and the KanpurVerse multiplayer server (JSON over WebSocket). */
import { z } from "zod";

export const PROTOCOL_VERSION = 1;
export const TICK_RATE = 20;                 // server broadcast Hz
export const CLIENT_SEND_RATE = 20;          // client input/state Hz
export const MAX_PLAYER_SPEED = 9;           // m/s on foot (sprint) — server rejects faster
export const MAX_VEHICLE_SPEED = 38;         // m/s (~137 km/h)
export const CHAT_MAX_LEN = 160;
export const NAME_MIN = 3;
export const NAME_MAX = 16;

export const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3>;

export const Appearance = z.object({
  body: z.enum(["m", "f"]),
  skin: z.number().int().min(0).max(5),
  hair: z.number().int().min(0).max(5),
  hairColor: z.number().int().min(0).max(4),
  top: z.number().int().min(0).max(7),
  bottom: z.number().int().min(0).max(5),
  shoes: z.number().int().min(0).max(3),
  accessory: z.number().int().min(0).max(3),
});
export type Appearance = z.infer<typeof Appearance>;

export const AnimState = z.enum(["idle", "walk", "run", "sprint", "jump", "fall", "sit", "wave", "dance", "laugh",
  "celebrate", "talk", "highfive", "drive", "punch"]);
export type AnimState = z.infer<typeof AnimState>;

export const Language = z.enum(["kanpuriya", "hindi", "english"]);
export type Language = z.infer<typeof Language>;

/** ---------- client → server ---------- */
export const C2S = z.discriminatedUnion("t", [
  z.object({ t: z.literal("hello"), v: z.literal(PROTOCOL_VERSION), token: z.string().optional(),
    guestName: z.string().min(NAME_MIN).max(NAME_MAX).optional(), appearance: Appearance.optional(), lang: Language.optional() }),
  z.object({ t: z.literal("join"), room: z.string().min(1).max(32) }),
  z.object({ t: z.literal("state"), p: Vec3, ry: z.number(), anim: AnimState, seq: z.number().int() }),
  z.object({ t: z.literal("chat"), text: z.string().min(1).max(CHAT_MAX_LEN) }),
  z.object({ t: z.literal("emote"), anim: AnimState }),
  z.object({ t: z.literal("vehicle.enter"), id: z.string(), seat: z.enum(["driver", "passenger"]) }),
  z.object({ t: z.literal("vehicle.exit") }),
  z.object({ t: z.literal("vehicle.state"), id: z.string(), p: Vec3, q: z.tuple([z.number(), z.number(), z.number(), z.number()]), v: z.number() }),
  z.object({ t: z.literal("mission.start"), id: z.string() }),
  z.object({ t: z.literal("mission.checkpoint"), id: z.string(), index: z.number().int(), p: Vec3 }),
  z.object({ t: z.literal("mission.abandon") }),
  z.object({ t: z.literal("profile.update"), appearance: Appearance.optional(), lang: Language.optional() }),
  z.object({ t: z.literal("social"), action: z.enum(["friend.add", "friend.remove", "block", "unblock", "mute", "unmute", "report", "party.invite", "party.leave", "party.accept"]), target: z.string(), reason: z.string().max(200).optional() }),
  z.object({ t: z.literal("shop.buy"), item: z.string().max(40) }),
  z.object({ t: z.literal("ping"), at: z.number() }),
]);
export type C2S = z.infer<typeof C2S>;

/** ---------- server → client ---------- */
export interface PlayerSnapshot { id: string; name: string; p: Vec3; ry: number; anim: AnimState; appearance: Appearance; vehicle?: string; seat?: "driver" | "passenger"; level: number }
export interface VehicleSnapshot { id: string; kind: VehicleKind; p: Vec3; q: [number, number, number, number]; v: number; driver?: string; passenger?: string }
export type VehicleKind = "hatchback" | "sedan" | "suv" | "bike" | "scooter" | "auto";

export type S2C =
  | { t: "welcome"; id: string; token: string; name: string; profile: PlayerProfile; serverTime: number }
  | { t: "joined"; room: string; players: PlayerSnapshot[]; vehicles: VehicleSnapshot[]; time: number /* world clock 0..1 */ }
  | { t: "snapshot"; time: number; players: PlayerSnapshot[]; vehicles: VehicleSnapshot[]; ack?: number }
  | { t: "player.join"; player: PlayerSnapshot }
  | { t: "player.leave"; id: string }
  | { t: "chat"; from: string; name: string; text: string; at: number }
  | { t: "emote"; id: string; anim: AnimState }
  | { t: "vehicle.update"; vehicle: VehicleSnapshot }
  | { t: "mission.update"; id: string; status: "started" | "checkpoint" | "completed" | "failed"; index?: number; reward?: { coins: number; xp: number } }
  | { t: "profile"; profile: PlayerProfile }
  | { t: "toast"; text: string; kind?: "info" | "reward" | "error" }
  | { t: "social"; event: string; from?: string; name?: string; party?: string[] }
  | { t: "error"; code: string; message: string }
  | { t: "pong"; at: number; serverTime: number }
  | { t: "correct"; p: Vec3; reason: string };

export interface PlayerProfile {
  name: string; appearance: Appearance; lang: Language; level: number; xp: number; coins: number;
  missionsCompleted: string[]; unlocked: string[]; friends: string[]; blocked: string[]; playtimeSec: number;
}

export const DEFAULT_APPEARANCE: Appearance = { body: "m", skin: 2, hair: 1, hairColor: 0, top: 0, bottom: 0, shoes: 0, accessory: 0 };
