"use client";
/** NPC conversation panel: greeting → offers/choices; plays voice + subtitles. */
import { useEffect, useRef, useState } from "react";
import { NPCS, MISSIONS, type DialogueLine } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { useDialogueLines } from "../game/dialogueData";
import { speak, stopVoice } from "../audio/voice";
import { net } from "../net/client";
import { sfx } from "../audio/sfx";

export function DialoguePanel() {
  const dialogue = useStore(s => s.dialogue); const lang = useStore(s => s.settings.lang); const lines = useDialogueLines(); const profile = useStore(s => s.profile); const mission = useStore(s => s.mission);
  const [line, setLine] = useState<DialogueLine | null>(null); const seen = useRef(0);
  const npc = NPCS.find(n => n.id === dialogue?.npc);

  useEffect(() => {
    if (!dialogue || !npc) return;
    const cat = npc.role === "cafe" ? "cafe" : npc.role === "auto" ? "auto" : npc.role === "shopkeeper" ? "shop" : npc.role === "police" ? "police" : "greeting";
    const pool = lines.filter(l => l.npc === npc.id && l.category === cat); const first = pool[seen.current++ % Math.max(1, pool.length)];
    if (first) { setLine(first); speak(first, npc.id); }
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
        <p className="dlg-text">{line.text}</p>{lang !== "english" && line.roman && <p className="dlg-roman">{line.roman}</p>}
        <div className="dlg-actions">
          {next && <button className="btn" onClick={() => go(next)}>{t("Continue", "आगे")}</button>}
          {offers.map(o => { const def = m(o.mission!); const done = profile?.missionsCompleted.includes(def.id); return <button key={o.id} className="btn btn-accent" onClick={() => go(o)} title={t(def.desc, def.descHi)}>{t(def.name, def.nameHi)}{done ? " ↻" : ""} <small>+{def.reward.coins}🪙</small></button>; })}
          {line.category === "mission_offer" && line.mission && !mission && <button className="btn btn-accent" onClick={() => accept(line)}>{t("Accept", "हाँ, करेंगे")}</button>}
          {npc.role === "guide" && <button className="btn" onClick={() => { const d = lines.find(l => l.npc === npc.id && l.category === "direction"); if (d) go(d); }}>{t("Directions", "रास्ता बताओ")}</button>}
          {npc.role === "shopkeeper" && <button className="btn" onClick={() => { close(); window.dispatchEvent(new CustomEvent("kv:shop")); }}>{t("Browse shop", "दुकान देखो")}</button>}
          <button className="btn-ghost" onClick={close}>{t("Leave", "चलो फिर")}</button>
        </div>
      </div>
    </div>
  );
}
