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
  "celebrate", "talk", "highfive", "drive", "punch", "packet", "openpacket", "consume", "spit"]);
export type AnimState = z.infer<typeof AnimState>;

export const Language = z.enum(["kanpuriya", "hindi", "english"]);
export type Language = z.infer<typeof Language>;

/** ---------- local game actions (single-player; there is no server) ---------- */
export const C2S = z.discriminatedUnion("t", [
  z.object({ t: z.literal("emote"), anim: AnimState }),
  z.object({ t: z.literal("vehicle.enter"), id: z.string(), seat: z.enum(["driver", "passenger"]) }),
  z.object({ t: z.literal("vehicle.exit"), p: Vec3.optional() }),
  z.object({ t: z.literal("mission.start"), id: z.string() }),
  z.object({ t: z.literal("mission.checkpoint"), id: z.string(), index: z.number().int(), p: Vec3 }),
  z.object({ t: z.literal("mission.abandon") }),
  z.object({ t: z.literal("profile.update"), appearance: Appearance.optional(), lang: Language.optional() }),
  z.object({ t: z.literal("shop.buy"), item: z.string().max(40) }),
  z.object({ t: z.literal("street.consume") }),
  z.object({ t: z.literal("street.spit") }),
]);
export type C2S = z.infer<typeof C2S>;

/** ---------- local world snapshots ---------- */
export interface PlayerSnapshot { id: string; name: string; p: Vec3; ry: number; anim: AnimState; appearance: Appearance; vehicle?: string; seat?: "driver" | "passenger"; level: number }
export interface VehicleSnapshot { id: string; kind: VehicleKind; p: Vec3; q: [number, number, number, number]; v: number; driver?: string; passenger?: string }
export type VehicleKind = "hatchback" | "sedan" | "suv" | "bike" | "scooter" | "auto" | "erickshaw" | "bus" | "truck" | "taxi"
  | "compactsuv" | "muv" | "offroader" | "cruiser" | "sportbike" | "cyclerickshaw" | "schoolbus" | "van";

export interface PlayerProfile {
  inventory?: { gutka: number }; civic?: number;
  name: string; appearance: Appearance; lang: Language; level: number; xp: number; coins: number;
  missionsCompleted: string[]; unlocked: string[]; playtimeSec: number;
}

export const DEFAULT_APPEARANCE: Appearance = { body: "m", skin: 2, hair: 1, hairColor: 0, top: 0, bottom: 0, shoes: 0, accessory: 0 };
