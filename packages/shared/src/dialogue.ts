/** Dialogue library schema + loader. Lines live in assets/dialogues/<lang>.json; audio in assets/audio/dialogues/<lang>/<id>.mp3 */
import { z } from "zod";

export const DialogueCategory = z.enum(["greeting", "direction", "mission_offer", "mission_done", "shop", "auto", "cafe", "police", "idle", "reaction", "farewell", "tutorial", "social"]);
export type DialogueCategory = z.infer<typeof DialogueCategory>;

export const DialogueLine = z.object({
  id: z.string(),                      // stable across languages, e.g. guide_babloo.greet_1
  npc: z.string(),                     // NpcDef.id or "any"
  category: DialogueCategory,
  text: z.string(),                    // display text (Devanagari for kanpuriya/hindi, Latin for english)
  roman: z.string().optional(),        // romanised Hinglish for the english subtitle track / TTS of Hinglish
  voice: z.string().optional(),        // overrides NpcDef.voice
  rate: z.string().optional(),         // edge-tts rate e.g. "+4%"
  pitch: z.string().optional(),        // edge-tts pitch e.g. "-2Hz"
  emotion: z.enum(["neutral", "happy", "annoyed", "excited", "sly", "warm"]).default("neutral"),
  next: z.string().optional(),         // follow-up line id
  mission: z.string().optional(),      // mission id offered
});
export type DialogueLine = z.infer<typeof DialogueLine>;

export const DialogueFile = z.object({ lang: z.enum(["kanpuriya", "hindi", "english"]), lines: z.array(DialogueLine) });
export type DialogueFile = z.infer<typeof DialogueFile>;

/** Voice profiles used by scripts/generate_voices.py (edge-tts) and the browser speechSynthesis fallback. */
export const VOICE_PROFILES: Record<string, { edge: string; rate: string; pitch: string; browserGender: "male" | "female" }> = {
  male_local:     { edge: "hi-IN-MadhurNeural", rate: "+2%",  pitch: "-4Hz", browserGender: "male" },
  male_young:     { edge: "hi-IN-MadhurNeural", rate: "+8%",  pitch: "+3Hz", browserGender: "male" },
  shopkeeper:     { edge: "hi-IN-MadhurNeural", rate: "-2%",  pitch: "-6Hz", browserGender: "male" },
  auto_driver:    { edge: "hi-IN-MadhurNeural", rate: "+6%",  pitch: "-2Hz", browserGender: "male" },
  police:         { edge: "hi-IN-MadhurNeural", rate: "-4%",  pitch: "-8Hz", browserGender: "male" },
  female_young:   { edge: "hi-IN-SwaraNeural",  rate: "+6%",  pitch: "+2Hz", browserGender: "female" },
  female_local:   { edge: "hi-IN-SwaraNeural",  rate: "+0%",  pitch: "-3Hz", browserGender: "female" },
  english_male:   { edge: "en-IN-PrabhatNeural", rate: "+2%", pitch: "+0Hz", browserGender: "male" },
  english_female: { edge: "en-IN-NeerjaExpressiveNeural", rate: "+4%", pitch: "+0Hz", browserGender: "female" },
};

/** Pick a line by npc + category (deterministic by salt). */
export function pickLine(lines: DialogueLine[], npc: string, category: DialogueCategory, salt = 0): DialogueLine | undefined {
  const pool = lines.filter(l => l.category === category && (l.npc === npc || l.npc === "any"));
  const own = pool.filter(l => l.npc === npc);
  const src = own.length ? own : pool;
  if (!src.length) return undefined;
  return src[Math.abs(salt) % src.length];
}
