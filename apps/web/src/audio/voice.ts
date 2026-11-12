"use client";
/** NPC voice: pre-generated mp3 (Edge TTS, via scripts/generate_voices.py) → fallback browser speechSynthesis (hi-IN / en-IN). Subtitles always. */
import { VOICE_PROFILES, NPCS, type DialogueLine, type Language } from "@kanpurverse/shared";
import { useStore } from "../state/store";

const manifests: Partial<Record<Language, Record<string, { file: string }>>> = {};
let current: HTMLAudioElement | null = null;
let voicesReady = false;
if (typeof window !== "undefined" && "speechSynthesis" in window) { const load = () => { if (speechSynthesis.getVoices().length) voicesReady = true; }; load(); speechSynthesis.onvoiceschanged = load; }

async function manifest(lang: Language) {
  if (manifests[lang]) return manifests[lang]!;
  try { const r = await fetch(`/audio/dialogues/${lang}/manifest.json`, { cache: "force-cache" }); manifests[lang] = r.ok ? await r.json() : {}; } catch { manifests[lang] = {}; }
  return manifests[lang]!;
}

function pickBrowserVoice(lang: Language, gender: "male" | "female"): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices(); const want = lang === "english" ? ["en-IN", "en-GB", "en-US"] : ["hi-IN", "hi"];
  const pool = voices.filter(v => want.some(w => v.lang.replace("_", "-").startsWith(w)));
  const byGender = pool.find(v => (gender === "female" ? /female|swara|neerja|kalpana|lekha|veena|samantha|zira/i : /male|madhur|prabhat|hemant|rishi|daniel/i).test(v.name));
  return byGender ?? pool[0] ?? voices.find(v => v.lang.startsWith(want[0].slice(0, 2)));
}

export function stopVoice() { if (current) { current.pause(); current = null; } if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); }

/** Speak a line: shows the subtitle (always), plays audio (if voice enabled). Returns a promise resolving when audio ends. */
export async function speak(line: DialogueLine, npcId: string): Promise<void> {
  const s = useStore.getState(); const lang = s.settings.lang; const npc = NPCS.find(n => n.id === npcId);
  const dur = Math.max(2500, Math.min(9000, 1200 + line.text.length * 65));
  const speaker = lang === "english" ? (npc?.name ?? "") : (npc?.nameHi ?? npc?.name ?? "");
  s.set({ subtitle: { speaker, text: line.text, roman: lang !== "english" ? line.roman : undefined, until: Date.now() + dur } });
  if (!s.settings.voice) return new Promise(r => setTimeout(r, dur));
  stopVoice();
  const m = await manifest(lang); const entry = m[line.id];
  if (entry) {
    return new Promise<void>(res => { const a = new Audio(entry.file); a.volume = s.settings.dialogue * useStore.getState().settings.master; current = a; a.onended = () => { if (current === a) current = null; res(); }; a.onerror = () => { current = null; speakBrowser(line, npcId, lang).then(res); }; a.play().catch(() => speakBrowser(line, npcId, lang).then(res)); });
  }
  return speakBrowser(line, npcId, lang);
}

function speakBrowser(line: DialogueLine, npcId: string, lang: Language): Promise<void> {
  return new Promise(res => {
    if (typeof speechSynthesis === "undefined") return setTimeout(res, 2500);
    const profKey = line.voice ?? NPCS.find(n => n.id === npcId)?.voice ?? "male_young"; const prof = VOICE_PROFILES[profKey];
    const u = new SpeechSynthesisUtterance(lang === "english" ? line.text : line.text);
    u.lang = lang === "english" ? "en-IN" : "hi-IN"; u.rate = 0.95 + (parseInt(prof?.rate ?? "0") || 0) / 100; u.pitch = 1 + (parseInt(prof?.pitch ?? "0") || 0) / 40; u.volume = useStore.getState().settings.dialogue * useStore.getState().settings.master;
    const v = voicesReady ? pickBrowserVoice(lang, prof?.browserGender ?? "male") : undefined; if (v) u.voice = v;
    u.onend = () => res(); u.onerror = () => res();
    speechSynthesis.speak(u);
    setTimeout(res, 12000); // safety
  });
}
