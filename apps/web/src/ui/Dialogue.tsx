"use client";
/** NPC conversation panel: greeting → offers/choices; plays voice + subtitles. */
import { useEffect, useRef, useState } from "react";
import { PAAN_VENDOR, STREET, NPCS, MISSIONS, STORY_CHAPTERS, storyUnlocked, sideMissionsOpen, type DialogueLine } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { useDialogueLines } from "../game/dialogueData";
import { speak, stopVoice } from "../audio/voice";
import { net } from "../net/client";
import { sayStreet, npcNear, STREET_LINES } from "../game/streetRuntime";
import { sfx } from "../audio/sfx";

export function DialoguePanel() {
  const dialogue = useStore(s => s.dialogue); const lang = useStore(s => s.settings.lang); const lines = useDialogueLines(); const profile = useStore(s => s.profile); const mission = useStore(s => s.mission);
  const [line, setLine] = useState<DialogueLine | null>(null); const seen = useRef(0);
  const npc = NPCS.find(n => n.id === dialogue?.npc);

  useEffect(() => { const id = setInterval(() => { if (dialogue && !npcNear(dialogue.npc, 5)) useStore.getState().set({ dialogue: undefined }); }, 250); return () => clearInterval(id); }, [dialogue]);
  useEffect(() => {
    if (!dialogue || !npc) return;
    const cat = npc.role === "cafe" ? "cafe" : npc.role === "auto" ? "auto" : npc.role === "shopkeeper" ? "shop" : npc.role === "police" ? "police" : "greeting";
    const pool = lines.filter(l => l.npc === npc.id && l.category === cat); const first = pool[seen.current++ % Math.max(1, pool.length)];
    const greeting = first ?? { id: "paan.greeting", npc: npc.id, category: "shop" as const, text: "आओ गुरु! नुक्कड़ की काल्पनिक पान दुकान में स्वागत है। क्या चाहिए?", emotion: "warm" as const }; setLine(greeting); speak(greeting, npc.id);
    const esc = (e: KeyboardEvent) => { if (e.code === "Escape") close(); }; window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogue?.npc, lang]);

  if (!dialogue || !npc || !line) return null;
  const offers = lines.filter(l => l.npc === npc.id && l.category === "mission_offer" && l.mission && !mission);
  const next = line.next ? lines.find(l => l.id === line.next) : undefined;
  const t = (en: string, hi: string) => lang === "english" ? en : hi;
  const go = (l: DialogueLine) => { setLine(l); speak(l, npc.id); sfx.ui(); };
  function close() { stopVoice(); useStore.getState().set({ dialogue: undefined }); const bye = lines.find(l => l.npc === npc!.id && l.category === "farewell") ?? lines.find(l => l.npc === "any" && l.category === "farewell"); if (bye) speak(bye, npc!.id); }
  function accept(l: DialogueLine) { net.send({ t: "mission.start", id: l.mission! }); sfx.ui(); useStore.getState().set({ dialogue: undefined }); stopVoice(); }
  const m = (id: string) => MISSIONS.find(x => x.id === id)!;

  return (
    <div className="dlg">
      <div className="dlg-card">
        <div className="dlg-head"><span className="dlg-name">{t(npc.name, npc.nameHi)}</span><span className="dlg-role">{npc.role}</span><button className="btn-ghost" onClick={close} aria-label="Close">✕</button></div>
        <p className="dlg-text">{line.text}</p>{lang !== "english" && line.roman && useStore.getState().settings.englishSubs && <p className="dlg-roman">{line.roman}</p>}
        <div className="dlg-actions">
          {npc.id === PAAN_VENDOR && <div className="street-shop"><b>नुक्कड़ पान दुकान · काल्पनिक</b><p>Gutka / गुटखा · {STREET.price} 🪙 · झोले में {profile?.inventory?.gutka ?? 0}/{STREET.maxPackets}</p><button className="btn btn-accent" onClick={() => net.send({ t: "shop.buy", item: "gutka" })}>एक पैकेट खरीदो</button><small>काल्पनिक गेमप्ले। तंबाकू सेवन हानिकारक है।</small></div>}
          <div className="street-choices" aria-label="Kanpuri conversation">{(Object.keys(STREET_LINES) as (keyof typeof STREET_LINES)[]).map(cat => <button className="btn-sm" key={cat} onClick={() => { const result = sayStreet(npc.id,cat); if (result) setLine({ id:`street.${cat}`, npc:npc.id, text:result.reply, category:"social", emotion:result.mood.anger ? "annoyed" : "happy" }); }}>{STREET_LINES[cat].label}</button>)}</div>
          {next && <button className="btn" onClick={() => go(next)}>{t("Continue", "आगे")}</button>}
          {!mission && STORY_CHAPTERS.filter(c => c.giver === npc.id && !profile?.missionsCompleted.includes(c.missionId) && storyUnlocked(c.missionId, profile?.missionsCompleted ?? [])).slice(0, 1).map(c => <button key={c.missionId} className="btn btn-accent story-btn" onClick={() => { net.send({ t: "mission.start", id: c.missionId }); close(); }}>{t(`CHAPTER ${c.n} · ${c.title}`, `अध्याय ${c.n} · ${c.titleHi}`)}</button>)}
          {offers.filter(o => sideMissionsOpen(profile?.missionsCompleted ?? []) && !STORY_CHAPTERS.some(c => c.missionId === o.mission)).map(o => { const def = m(o.mission!); const done = profile?.missionsCompleted.includes(def.id); return <button key={o.id} className="btn btn-accent" onClick={() => go(o)} title={t(def.desc, def.descHi)}>{t(def.name, def.nameHi)}{done ? " ↻" : ""} <small>+{def.reward.coins}🪙</small></button>; })}
          {line.category === "mission_offer" && line.mission && !mission && <button className="btn btn-accent" onClick={() => accept(line)}>{t("Accept", "हाँ, करेंगे")}</button>}
          {npc.role === "guide" && <button className="btn" onClick={() => { const d = lines.find(l => l.npc === npc.id && l.category === "direction"); if (d) go(d); }}>{t("Directions", "रास्ता बताओ")}</button>}
          {npc.role === "shopkeeper" && npc.id !== PAAN_VENDOR && <button className="btn" onClick={() => { close(); window.dispatchEvent(new CustomEvent("kv:shop")); }}>{t("Browse shop", "दुकान देखो")}</button>}
          <button className="btn-ghost" onClick={close}>{t("Leave", "चलो फिर")}</button>
        </div>
      </div>
    </div>
  );
}
