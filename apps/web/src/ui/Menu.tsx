"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "../state/store";
import { net, WS_URL } from "../net/client";
import { unlockAudio, sfx } from "../audio/sfx";
import { SettingsPanel } from "./Settings";
import { CharacterCreator } from "./Character";

export function MainMenu() {
  const s = useStore(); const lang = s.settings.lang; const t = (en: string, hi: string) => lang === "english" ? en : hi;
  const [view, setView] = useState<"main" | "settings" | "character" | "credits">(!s.name ? "character" : "main"); const [room, setRoom] = useState("kanpur-1");
  const play = () => { unlockAudio(); sfx.ui(); if (!s.name) return setView("character"); s.set({ screen: "loading", errorText: undefined }); net.connect(room.trim() || "kanpur-1"); };
  if (view === "character") return <CharacterCreator onDone={() => setView("main")} />;
  return <div className="screen menu">
    <div className="menu-card">
      <div className="logo">KANPUR<span>VERSE</span></div><div className="tag">{t("Apna shehar, apni duniya.", "अपना शहर, अपनी दुनिया।")}</div>
      {view === "main" && <div className="menu-col">
        <p className="muted">{s.name ? t(`Playing as ${s.name}`, `${s.name} के रूप में`) : t("No character yet", "अभी कोई किरदार नहीं")}</p>
        <label className="field"><span>{t("Room (friends join the same name)", "रूम (दोस्त वही नाम डालें)")}</span><input value={room} onChange={e => setRoom(e.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase())} maxLength={24} /></label>
        <button className="btn btn-accent big" onClick={play}>{t("Play", "खेलो")}</button>
        <button className="btn" onClick={() => setView("character")}>{t("Character", "किरदार")}</button>
        <button className="btn" onClick={() => setView("settings")}>{t("Settings", "सेटिंग्स")}</button>
        <button className="btn" onClick={() => setView("credits")}>{t("About", "बारे में")}</button>
        <Link className="btn-ghost" href="/">{t("Back to site", "साइट पर वापस")}</Link>
        <p className="muted small">{t("Server", "सर्वर")}: {WS_URL}</p>
      </div>}
      {view === "settings" && <><SettingsPanel /><button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></>}
      {view === "credits" && <div className="menu-col"><p>{t("KanpurVerse is a free, browser-based open-world game inspired by Kanpur, built by Velto Studios. Landmarks are fictionalised tributes; no real businesses are represented.", "कानपुरवर्स कानपुर से प्रेरित एक मुफ़्त ब्राउज़र गेम है, वेल्टो स्टूडियोज़ ने बनाया। स्थल काल्पनिक श्रद्धांजलि हैं।")}</p><p className="muted">three.js · React Three Fiber · Rapier · Next.js · Node ws · Edge TTS voices</p><button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
    </div>
  </div>;
}

export function LoadingScreen() { const t = useStore(s => s.settings.lang === "english"); return <div className="screen center"><div className="logo">KANPUR<span>VERSE</span></div><div className="spinner" /><p className="muted">{t ? "Connecting to the server…" : "सर्वर से जुड़ रहे हैं…"}</p><Tips /></div>; }
export function ErrorScreen() { const s = useStore(); return <div className="screen center"><div className="logo">KANPUR<span>VERSE</span></div><h2>{s.settings.lang === "english" ? "Couldn't connect" : "जुड़ नहीं पाए"}</h2><p>{s.errorText}</p><p className="muted small">{WS_URL}</p><button className="btn btn-accent" onClick={() => s.set({ screen: "menu" })}>{s.settings.lang === "english" ? "Back to menu" : "मेन्यू"}</button></div>; }
function Tips() { const en = useStore(s => s.settings.lang === "english"); const tips = en ? ["Press E near anyone to talk.", "Bring a friend: party missions pay bonus coins.", "Sunset Point is prettiest around 18:00 in-game.", "Space is the handbrake when driving."] : ["किसी के पास E दबाओ, बात होगी।", "दोस्त लाओ: पार्टी मिशन में बोनस सिक्के।", "सनसेट पॉइंट शाम 6 बजे सबसे सुंदर।", "गाड़ी में Space हैंडब्रेक है।"]; return <p className="tip">{tips[Math.floor(Date.now() / 4000) % tips.length]}</p>; }
