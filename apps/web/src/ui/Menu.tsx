"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "../state/store";
import { net, WS_URL } from "../net/client";
import { unlockAudio, sfx } from "../audio/sfx";
import { SettingsPanel } from "./Settings";
import dynamic from "next/dynamic";
const CharacterCreator = dynamic(() => import("./Character").then(m => m.CharacterCreator), { ssr: false, loading: () => <div className="screen center"><Skyline /><Logo size={56} /><div className="spinner" /><p className="muted">Loading character studio…</p></div> });
import { Logo, Skyline } from "./Brand";

export function LanguageGate() {
  const set = useStore(s => s.setSettings);
  const pick = (lang: "english" | "hindi" | "kanpuriya") => { unlockAudio(); sfx.ui(); set({ lang, langChosen: true }); };
  return <div className="screen menu"><Skyline /><div className="lang-gate"><Logo size={60} />
    <h2>Choose your language · अपनी भाषा चुनें</h2><p className="muted">You can change this any time in Settings · सेटिंग्स में कभी भी बदल सकते हैं</p>
    <div className="lang-cards">
      <button className="lang-card" onClick={() => pick("english")}><span className="lang-big">English</span><small>Menus, subtitles and NPC voices in English</small></button>
      <button className="lang-card" onClick={() => pick("hindi")}><span className="lang-big">हिंदी</span><small>मेन्यू, सबटाइटल और NPC की आवाज़ हिंदी में</small></button>
      <button className="lang-card accent" onClick={() => pick("kanpuriya")}><span className="lang-big">कनपुरिया</span><small>असली कानपुर वाली बोली — &ldquo;का हो भैया!&rdquo;</small></button>
    </div></div></div>;
}

export function MainMenu() { const chosen = useStore(s => s.settings.langChosen); return chosen ? <MainMenuInner /> : <LanguageGate />; }
function MainMenuInner() {
  const s = useStore(); const lang = s.settings.lang; const t = (en: string, hi: string) => lang === "english" ? en : hi;
  const [view, setView] = useState<"main" | "settings" | "character" | "about" | "howto" | "multiplayer">(!s.name ? "character" : "main"); const [room, setRoom] = useState("kanpur-1");
  const play = (r = room) => { unlockAudio(); sfx.ui(); if (!s.name) return setView("character"); s.set({ screen: "loading", errorText: undefined, loadStage: "engine" }); net.connect(r.trim() || "kanpur-1"); };
  if (view === "character") return <CharacterCreator onDone={() => setView("main")} />;
  const Btn = ({ k, label, hint, accent }: { k: "main" | "settings" | "character" | "about" | "howto" | "multiplayer" | "play"; label: string; hint?: string; accent?: boolean }) => (
    <button className={`mbtn ${accent ? "accent" : ""}`} onClick={() => { sfx.ui(); if (k === "play") play(); else setView(k); }}><span>{label}</span>{hint && <small>{hint}</small>}</button>);
  return <div className="screen menu"><Skyline />
    <div className="menu-layout">
      <div className="menu-left">
        <Logo size={64} /><div className="tag">{t("Apna shehar, apni duniya.", "अपना शहर, अपनी दुनिया।")}</div>
        {view === "main" && <nav className="menu-nav">
          <Btn k="play" label={t("Play now", "खेलो")} hint={s.name ? t(`as ${s.name} · room ${room}`, `${s.name} · रूम ${room}`) : t("create a character first", "पहले किरदार बनाओ")} accent />
          <Btn k="multiplayer" label={t("Multiplayer", "मल्टीप्लेयर")} hint={t("join or create a room with friends", "दोस्तों के साथ रूम बनाओ")} />
          <Btn k="character" label={t("Character", "किरदार")} hint={t("looks, name, outfit", "रूप, नाम, कपड़े")} />
          <Btn k="settings" label={t("Settings", "सेटिंग्स")} hint={t("language, audio, graphics", "भाषा, आवाज़, ग्राफ़िक्स")} />
          <Btn k="howto" label={t("How to play", "कैसे खेलें")} />
          <Btn k="about" label={t("About Velto Studios", "वेल्टो स्टूडियोज़")} />
          <Link className="mlink" href="/">{t("← Back to site", "← साइट पर वापस")}</Link>
        </nav>}
        {view === "multiplayer" && <div className="menu-panel"><h2>{t("Multiplayer", "मल्टीप्लेयर")}</h2>
          <p className="muted">{t("Everyone who enters the same room name plays together. Share the room name with friends.", "एक ही रूम नाम डालने वाले साथ खेलते हैं। रूम का नाम दोस्तों को भेजो।")}</p>
          <label className="field"><span>{t("Room name", "रूम का नाम")}</span><input value={room} onChange={e => setRoom(e.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase())} maxLength={24} /></label>
          <div className="row"><button className="btn btn-accent" onClick={() => play()}>{t("Join room", "रूम में जाओ")}</button><button className="btn" onClick={() => { const r = "kv-" + Math.random().toString(36).slice(2, 7); setRoom(r); play(r); }}>{t("Create private room", "प्राइवेट रूम बनाओ")}</button><button className="btn-ghost" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>
          <p className="muted small">{t("Server", "सर्वर")}: {WS_URL.replace(/^wss?:\/\//, "")}</p></div>}
        {view === "settings" && <div className="menu-panel"><h2>{t("Settings", "सेटिंग्स")}</h2><SettingsPanel /><button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
        {view === "howto" && <div className="menu-panel"><h2>{t("How to play", "कैसे खेलें")}</h2>
          <div className="help-grid"><div><kbd>W A S D</kbd> {t("move", "चलो")}</div><div><kbd>Shift</kbd> {t("sprint", "दौड़ो")}</div><div><kbd>Space</kbd> {t("jump / brake", "कूदो / ब्रेक")}</div><div><kbd>Mouse</kbd> {t("look (click to lock)", "कैमरा (क्लिक करो)")}</div><div><kbd>E</kbd> {t("talk / enter vehicle / photo", "बात / गाड़ी / फ़ोटो")}</div><div><kbd>F</kbd> {t("exit vehicle", "गाड़ी से उतरो")}</div><div><kbd>H</kbd> {t("horn", "हॉर्न")}</div><div><kbd>1–6</kbd> {t("emotes", "इमोट")}</div><div><kbd>T</kbd> {t("chat", "चैट")}</div><div><kbd>M</kbd> {t("map", "नक्शा")}</div><div><kbd>Tab</kbd> {t("players & party", "खिलाड़ी")}</div><div><kbd>I</kbd> {t("inventory", "इन्वेंटरी")}</div></div>
          <p className="muted">{t("Start at Cafe Chowk: Babloo Bhaiya (yellow diamond) gives your first mission. Coins come only from missions; spend them at Naveen Market. Phones: left joystick, drag to look, buttons on the right.", "कैफ़े चौक से शुरू करो: बबलू भैया (पीला हीरा) पहला मिशन देंगे। सिक्के सिर्फ़ मिशन से; नवीन मार्केट में खर्च करो। फ़ोन पर: बायाँ जॉयस्टिक, खींच कर देखो, दायें बटन।")}</p>
          <button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
        {view === "about" && <div className="menu-panel"><h2>Velto Studios</h2>
          <p>{t("KanpurVerse is a free, browser-based open world inspired by Kanpur, made by Velto Studios — a digital product studio from Kanpur that builds websites, apps, AI products and games.", "कानपुरवर्स कानपुर से प्रेरित एक मुफ़्त ब्राउज़र गेम है, वेल्टो स्टूडियोज़ ने बनाया — कानपुर का डिजिटल प्रोडक्ट स्टूडियो जो वेबसाइट, ऐप, AI प्रोडक्ट और गेम बनाता है।")}</p>
          <p className="muted">{t("Landmarks are fictionalised tributes; no real business or person is depicted. No real-money purchases, no tracking.", "स्थल काल्पनिक श्रद्धांजलि हैं; कोई असली व्यवसाय या व्यक्ति नहीं। कोई असली पैसा नहीं, कोई ट्रैकिंग नहीं।")}</p>
          <p className="muted small">three.js · React Three Fiber · Rapier · Next.js · Node ws · Edge neural voices · Instagram @velto_studios</p>
          <button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
      </div>
      <div className="menu-right"><div className="menu-card-art"><div className="art-badge">{t("Public preview", "पब्लिक प्रीव्यू")}</div><ul className="art-list"><li>{t("Real Kanpur streets from OpenStreetMap · railway crossings · Kanpur Central", "OpenStreetMap से असली कानपुर की सड़कें · रेलवे फाटक · कानपुर सेंट्रल")}</li><li>{t("Kanpuriya NPCs with voice + subtitles", "कनपुरिया NPC, आवाज़ + सबटाइटल")}</li><li>{t("10 vehicles · 14 Kanpuriya missions · live IST clock · real multiplayer", "10 गाड़ियाँ · 14 कनपुरिया मिशन · असली कानपुर समय · असली मल्टीप्लेयर")}</li></ul></div></div>
    </div>
    <div className="menu-foot muted small">v0.2 · {t("Works best in Brave, Chrome or Safari on a laptop; phones supported.", "ब्रेव, क्रोम या सफ़ारी में सबसे अच्छा; फ़ोन भी चलेगा।")}</div>
  </div>;
}

const STAGES: Record<string, [string, string, number]> = { engine: ["Loading engine & world", "इंजन और दुनिया लोड हो रही है", 20], connecting: ["Connecting to server", "सर्वर से जुड़ रहे हैं", 50], auth: ["Creating session", "सेशन बन रहा है", 70], joining: ["Joining room", "रूम में जा रहे हैं", 90], done: ["Entering Kanpur", "कानपुर में प्रवेश", 100] };
export function LoadingScreen() {
  const en = useStore(s => s.settings.lang === "english"); const stage = useStore(s => s.loadStage ?? "engine"); const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const t0 = Date.now(); const i = setInterval(() => setElapsed((Date.now() - t0) / 1000), 500); return () => clearInterval(i); }, []);
  const st = STAGES[stage] ?? STAGES.engine; const slow = elapsed > 12; const prog = useStore(s => s.loadProgress); const pct = stage === "engine" && prog !== undefined ? Math.round(prog * 0.5) : st[2];
  return <div className="screen center"><Skyline /><Logo size={56} /><div className="progress"><div className="progress-bar" style={{ width: pct + "%" }} /></div><p className="muted">{en ? st[0] : st[1]}… {pct}%</p><div className="load-steps">{(["engine", "connecting", "auth", "joining", "done"] as const).map(k => <span key={k} className={`ls ${k === stage ? "on" : STAGES[k][2] < st[2] ? "done" : ""}`}>{en ? STAGES[k][0] : STAGES[k][1]}</span>)}</div>
    {slow && <p className="muted small">{en ? "Taking longer than usual. The server may be waking up (free hosting) — this can take up to 60 s." : "थोड़ा समय लग रहा है। सर्वर जाग रहा होगा (मुफ़्त होस्टिंग) — 60 सेकंड तक लग सकते हैं।"}</p>}
    {elapsed > 30 && <button className="btn" onClick={() => { net.disconnect(); useStore.getState().set({ screen: "menu" }); }}>{en ? "Cancel" : "रद्द करो"}</button>}
    <Tips /></div>;
}
export function ErrorScreen() { const s = useStore(); const en = s.settings.lang === "english";
  return <div className="screen center"><Skyline /><Logo size={56} /><h2>{en ? "Couldn't connect" : "जुड़ नहीं पाए"}</h2><p>{s.errorText}</p><p className="muted small">{WS_URL}</p>
    <div className="row"><button className="btn btn-accent" onClick={() => { s.set({ screen: "loading", errorText: undefined, loadStage: "connecting" }); net.connect(net.room); }}>{en ? "Retry" : "फिर कोशिश"}</button><button className="btn" onClick={() => s.set({ screen: "menu" })}>{en ? "Back to menu" : "मेन्यू"}</button></div></div>; }
function Tips() { const en = useStore(s => s.settings.lang === "english"); const tips = useMemo(() => en ? ["Press E near anyone to talk.", "Bring a friend: party missions pay bonus coins.", "Sunset Point is prettiest around 18:00 in-game.", "Space is the handbrake when driving.", "Press I for your inventory, M for the map."] : ["किसी के पास E दबाओ, बात होगी।", "दोस्त लाओ: पार्टी मिशन में बोनस सिक्के।", "सनसेट पॉइंट शाम 6 बजे सबसे सुंदर।", "गाड़ी में Space हैंडब्रेक है।", "I से इन्वेंटरी, M से नक्शा।"], [en]); const [i, setI] = useState(0); useEffect(() => { const t = setInterval(() => setI(x => x + 1), 3500); return () => clearInterval(t); }, []); return <p className="tip">{tips[i % tips.length]}</p>; }
