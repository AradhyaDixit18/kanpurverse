"use client";
/** Story presentation: letterboxed chapter cutscenes and the end credits roll. */
import { useEffect } from "react";
import { CREDITS, GAME_TITLE, GAME_TITLE_HI, PROTAGONIST, STUDIO } from "@kanpurverse/shared";
import { useStore, tl } from "../state/store";
import { sfx } from "../audio/sfx";
import { net } from "../net/client";

export function Cutscene() {
  const c = useStore(s => s.cutscene); const lang = useStore(s => s.settings.lang); const set = useStore(s => s.set);
  const advance = () => {
    const cur = useStore.getState().cutscene; if (!cur) return; sfx.ui();
    if (cur.i + 1 < cur.lines.length) set({ cutscene: { ...cur, i: cur.i + 1 } });
    else { set({ cutscene: undefined, credits: cur.then === "credits" ? true : undefined }); net.save(); }
  };
  const skip = () => { const cur = useStore.getState().cutscene; set({ cutscene: undefined, credits: cur?.then === "credits" ? true : undefined }); net.save(); };
  useEffect(() => {
    if (!c) return; if (document.pointerLockElement) document.exitPointerLock();
    const k = (e: KeyboardEvent) => { if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") { e.preventDefault(); e.stopPropagation(); advance(); } if (e.code === "Escape") { e.preventDefault(); e.stopPropagation(); skip(); } };
    window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!c]);
  if (!c) return null;
  const line = c.lines[c.i]; const en = lang === "english";
  return <div className="cutscene" role="dialog" aria-label="Story cutscene" onClick={advance}>
    <div className="cs-bar top"><span className="cs-title">{c.title}</span></div>
    <div className="cs-bar bottom">
      {line.speaker && <div className="cs-speaker">{en ? line.speaker : line.speakerHi}</div>}
      <p className={`cs-line ${line.speaker ? "" : "narration"}`}>{en ? line.en : line.hi}</p>
      {!en && useStore.getState().settings.englishSubs && <p className="cs-sub">{line.en}</p>}
      <div className="cs-foot"><span>{c.i + 1}/{c.lines.length}</span><span>E / Space · {en ? "next" : "आगे"} &nbsp; Esc · {en ? "skip" : "छोड़ो"}</span></div>
    </div>
  </div>;
}

export function Credits() {
  const on = useStore(s => s.credits); const set = useStore(s => s.set);
  useEffect(() => { if (!on) return; const k = (e: KeyboardEvent) => { if (e.code === "Escape" || e.code === "Enter") set({ credits: undefined }); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [on, set]);
  if (!on) return null;
  return <div className="credits" role="dialog" aria-label="Credits">
    <div className="credits-roll">
      <h1>{GAME_TITLE}</h1><h2>{GAME_TITLE_HI}</h2>
      <p className="credits-end">THE END · समाप्त</p>
      <p>{tl(`${PROTAGONIST.nameHi} फिर लौटेगी।`, `${PROTAGONIST.name} will return.`)}</p>
      {CREDITS.map(([a, b]) => <div key={a} className="credit"><small>{a}</small><b>{b}</b></div>)}
      <p className="muted">{tl("सभी किरदार, दुकानें और घटनाएँ काल्पनिक हैं। जगहें असली कानपुर से प्रेरित हैं।", "All characters, shops and events are fictional. Landmarks are stylised tributes.")}</p>
      <p className="credits-studio">{STUDIO}</p>
    </div>
    <button className="btn btn-accent credits-btn" onClick={() => set({ credits: undefined })}>{tl("कानपुर घूमते रहो", "Keep exploring Kanpur")}</button>
  </div>;
}
