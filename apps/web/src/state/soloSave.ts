import { z } from "zod";
import { Appearance, Language, newGameState } from "@kanpurverse/shared";
const finite = z.number().finite();
const SaveV1 = z.object({
  version: z.literal(1),
  savedAt: finite,
  position: z.tuple([finite, finite, finite]),
  profile: z.object({
    name: z.string().min(1).max(16),
    appearance: Appearance,
    lang: Language,
    level: z.number().int().min(1),
    xp: finite.nonnegative(),
    coins: finite.nonnegative(),
    missionsCompleted: z.array(z.string()),
    unlocked: z.array(z.string()),
    playtimeSec: finite.nonnegative(),
    inventory: z
      .object({ gutka: z.number().int().min(0).max(30) })
      .default({ gutka: 0 }),
    civic: z.number().min(0).max(100).default(100),
  }),
  health: z.number().min(0).max(100).default(100),
  ownedVehicles: z.array(z.string()).default(["v_scooter_1"]),
  collectibles: z.array(z.string()).default([]),
  worldTime: finite.min(0).max(1).default(0.69),
  mission: z
    .object({
      id: z.string(),
      index: z.number().int().nonnegative(),
      remaining: finite.positive().optional(),
    })
    .optional(),
});
const GameStateSchema = z.object({
  stamina: z.number().min(0).max(100),
  items: z.record(z.string(), z.number().int().min(0)),
  weapons: z.array(z.string()),
  equipped: z.string().optional(),
  clip: z.record(z.string(), z.number().int().min(0)),
  wardrobe: z.array(z.string()),
  outfit: z.object({ top: z.string(), bottom: z.string(), shoes: z.string(), acc: z.string().optional() }),
  boughtVehicles: z.array(z.string()),
  vehicleHealth: z.record(z.string(), z.object({ engine: z.number().min(0).max(100), body: z.number().min(0).max(100) })),
  stats: z.object({ knockouts: z.number(), deaths: z.number(), driftBest: z.number(), earned: z.number(), spent: z.number() }),
});
/** Version 2 adds the Phase D game state (stamina, inventory, weapons, wardrobe, vehicles, stats). */
export const SoloSave = SaveV1.extend({ version: z.literal(2), game: GameStateSchema });
export type SoloSaveData = z.infer<typeof SoloSave>;
/** Versioned migration: a v1 save keeps every story field and gains a fresh game state (existing coins untouched). */
export function migrateSave(raw: unknown): SoloSaveData | null {
  const v2 = SoloSave.safeParse(raw); if (v2.success) return v2.data;
  const v1 = SaveV1.safeParse(raw); if (!v1.success) return null;
  return SoloSave.parse({ ...v1.data, version: 2, game: newGameState() });
}
export function parseSoloSave(raw: string | null): SoloSaveData | null {
  try {
    return migrateSave(JSON.parse(raw ?? "null"));
  } catch {
    return null;
  }
}
export const SOLO_KEY = "kanpurverse.solo.v1";
export function readSoloSave() {
  try {
    return (
      parseSoloSave(localStorage.getItem(SOLO_KEY)) ??
      parseSoloSave(localStorage.getItem(SOLO_KEY + ".backup"))
    );
  } catch {
    return null;
  }
}
/** Atomic localStorage journal, mirrored to IndexedDB. The previous valid save remains recoverable. */
export function writeSoloSave(data: SoloSaveData) {
  const parsed = SoloSave.safeParse(data);
  if (!parsed.success) return false;
  const checked=parsed.data, raw=JSON.stringify(checked);
  try {
    const previous = localStorage.getItem(SOLO_KEY);
    if (parseSoloSave(previous))
      localStorage.setItem(SOLO_KEY + ".backup", previous!);
    if(previous && !parseSoloSave(previous)) localStorage.setItem(SOLO_KEY+".unreadable",previous);
    localStorage.setItem(SOLO_KEY, raw);
  } catch {
    return false;
  }
  if (typeof indexedDB !== "undefined") {
    const request = indexedDB.open("kanpurverse-solo", 1);
    request.onerror=()=>{};
    request.onupgradeneeded = () => request.result.createObjectStore("saves");
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("saves", "readwrite");
      tx.objectStore("saves").put(checked, "current");
      tx.oncomplete = () => db.close();
      tx.onerror=()=>db.close(); tx.onabort=()=>db.close();
    };
  }
  return true;
}
