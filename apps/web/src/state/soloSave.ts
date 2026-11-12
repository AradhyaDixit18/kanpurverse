import { z } from "zod";
import { Appearance, Language } from "@kanpurverse/shared";
const finite = z.number().finite();
export const SoloSave = z.object({
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
export type SoloSaveData = z.infer<typeof SoloSave>;
export function parseSoloSave(raw: string | null): SoloSaveData | null {
  try {
    const r = SoloSave.safeParse(JSON.parse(raw ?? "null"));
    return r.success ? r.data : null;
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
