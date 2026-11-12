"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "../state/store";
import { net } from "../net/client";
import { readSoloSave } from "../state/soloSave";
import { unlockAudio, sfx } from "../audio/sfx";
import { SettingsPanel } from "./Settings";
import { ControlsGuide } from "./Controls";
import dynamic from "next/dynamic";
const CharacterCreator = dynamic(() => import("./Character").then(m => m.CharacterCreator), { ssr: false, loading: () => <div className="screen center"><Skyline /><Logo size={56} /><div className="spinner" /><p className="muted">Loading character studio…</p></div> });
import { preloadGameEngine } from "../game/engineLoader";
import { Logo, Skyline, StudioMark } from "./Brand";
import { CREDITS, STORY_CHAPTERS, VEHICLE_SPECS, VEHICLE_INFO, VEHICLE_PRICES, type VehicleKind } from "@kanpurverse/shared";
import { loadGeo } from "../game/roads";
import { WorldMap } from "./MapUI";
const MenuScene = dynamic(() => import("./MenuScene"), { ssr: false, loading: () => null });
type View = "main" | "settings" | "character" | "about" | "howto" | "story" | "vehicles" | "credits" | "map";
function StoryList() { const lang = useStore(s => s.settings.lang); const done = readSoloSave()?.profile.missionsCompleted ?? []; const en = lang === "english";
  return <ol className="story-list">{STORY_CHAPTERS.map(c => { const ok = done.includes(c.missionId); const next = !ok && (c.n === 1 || done.includes(STORY_CHAPTERS[c.n - 2].missionId)); return <li key={c.n} className={ok ? "done" : next ? "next" : "locked"}><b>{c.n}. {en ? c.title : c.titleHi}</b><small>{ok ? (en ? "complete" : "पूरा") : next ? (en ? "next up" : "अगला") : (en ? "locked" : "बंद")}</small></li>; })}</ol>; }
function VehicleList() { const en = useStore(s => s.settings.lang === "english");
  return <div className="vehicle-list">{(Object.keys(VEHICLE_SPECS) as VehicleKind[]).map(k => { const v = VEHICLE_SPECS[k], i = VEHICLE_INFO[k]; return <div key={k} className="vrow"><b>{en ? i.name : i.nameHi}</b><small>{en ? i.cls : i.clsHi}</small><span>{Math.round(v.max * 3.6)} km/h · {v.accel} m/s² · {v.grip}g{VEHICLE_PRICES[k] ? ` · ₹${VEHICLE_PRICES[k]!.toLocaleString("en-IN")}` : ""}</span></div>; })}</div>; }
function MenuMap({ close }: { close: () => void }) { const [ready, setReady] = useState(false); useEffect(() => { loadGeo().then(() => setReady(true)); }, []); return ready ? <WorldMap close={close} /> : <div className="spinner" />; }

export function LanguageGate() {
  const set = useStore(s => s.setSettings);
  const pick = (lang: "english" | "hindi" | "kanpuriya") => { unlockAudio(); sfx.ui(); set({ lang, langChosen: true }); };
  return <div className="screen menu"><Skyline /><div className="lang-gate"><Logo size={60} />
    <h2>अपनी भाषा चुनो</h2><p className="muted">सेटिंग्स में कभी भी बदल सकते हो · Change any time in Settings</p>
    <div className="lang-cards">
      <button className="lang-card accent" onClick={() => pick("kanpuriya")}><span className="lang-big">कनपुरिया</span><small>असली कानपुर वाली बोली · डिफ़ॉल्ट — &ldquo;का हो भइया!&rdquo;</small></button>
      <button className="lang-card" onClick={() => pick("hindi")}><span className="lang-big">हिंदी</span><small>मेन्यू, सबटाइटल और आवाज़ सामान्य हिंदी में</small></button>
      <button className="lang-card" onClick={() => pick("english")}><span className="lang-big">English</span><small>Optional: menus and subtitles in English</small></button>
    </div></div></div>;
}

export function MainMenu() { const chosen = useStore(s => s.settings.langChosen); return chosen ? <MainMenuInner /> : <LanguageGate />; }
function MainMenuInner() {
  const s = useStore(); const lang = s.settings.lang; const t = (en: string, hi: string) => lang === "english" ? en : hi;
  const [view, setView] = useState<View>(!s.name ? "character" : "main");
  const play = () => { preloadGameEngine(); unlockAudio(); sfx.ui(); if (!s.name) return setView("character"); s.set({ screen: "loading", errorText: undefined, loadStage: "engine" }); net.connect(); };
  if (view === "character") return <CharacterCreator onDone={() => setView("main")} />;
  const Btn = ({ k, label, hint, accent }: { k: View | "play"; label: string; hint?: string; accent?: boolean }) => (
    <button className={`mbtn ${accent ? "accent" : ""}`} onClick={() => { sfx.ui(); if (k === "play") play(); else setView(k); }}><span>{label}</span>{hint && <small>{hint}</small>}</button>);
  return <div className="screen menu menu-v2"><Skyline /><MenuScene /><div className="menu-shade" />
    <div className="menu-layout">
      <div className="menu-left">
        <StudioMark /><Logo size={64} /><div className="tag">{t("City of Stories · starring Kanupriya Tommy", "कहानियों का शहर · कनुप्रिया टॉमी के साथ")}</div>
        {view === "main" && <nav className="menu-nav">
          <Btn k="play" label={t(readSoloSave() ? "Continue story" : "New story", readSoloSave() ? "कहानी जारी रखो" : "नई कहानी")} hint={s.name ? t(`as ${s.name} · saved on this device`, `${s.name} · इसी डिवाइस पर सेव`) : t("create a character first", "पहले किरदार बनाओ")} accent />
          {readSoloSave() && <button className="mbtn" onClick={() => { preloadGameEngine(); net.newGame(); }}><span>{t("New game", "नई शुरुआत")}</span><small>{t("Previous save kept as recovery backup", "पिछला सेव बैकअप में सुरक्षित")}</small></button>}
          <Btn k="story" label={t("Story", "कहानी")} hint={t("eight chapters · your progress", "आठ अध्याय · आपकी प्रगति")} />
          <Btn k="map" label={t("Map", "नक्शा")} hint={t("Kanpur, shops, missions", "कानपुर, दुकानें, मिशन")} />
          <Btn k="vehicles" label={t("Vehicles", "गाड़ियाँ")} hint={t("18 classes · handling sheet", "18 तरह की · चलाने की जानकारी")} />
          <Btn k="character" label={t("Character", "किरदार")} hint={t("looks, name, outfit", "रूप, नाम, कपड़े")} />
          <Btn k="settings" label={t("Settings", "सेटिंग्स")} hint={t("language, audio, graphics", "भाषा, आवाज़, ग्राफ़िक्स")} />
          <Btn k="howto" label={t("How to play · controls", "कैसे खेलें · कंट्रोल")} />
          <Btn k="credits" label={t("Credits", "क्रेडिट्स")} />
          <Btn k="about" label={t("About Velto Studios", "वेल्टो स्टूडियोज़")} />
          <Link className="mlink" href="/">{t("← Back to site", "← साइट पर वापस")}</Link>
        </nav>}
        {view === "story" && <div className="menu-panel"><h2>{t("Story", "कहानी")}</h2><StoryList /><button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
        {view === "vehicles" && <div className="menu-panel"><h2>{t("Vehicles", "गाड़ियाँ")}</h2><VehicleList /><button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
        {view === "credits" && <div className="menu-panel"><h2>{t("Credits", "क्रेडिट्स")}</h2>{CREDITS.map(([a, b]) => <p key={a}><small className="muted">{a}</small><br /><b>{b}</b></p>)}<p className="muted small">Characters & animations: Quaternius (CC0) · Map: © OpenStreetMap contributors</p><button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
        {view === "map" && <div className="menu-panel wide"><MenuMap close={() => setView("main")} /></div>}
        {view === "settings" && <div className="menu-panel"><h2>{t("Settings", "सेटिंग्स")}</h2><SettingsPanel /><button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
        {view === "howto" && <div className="menu-panel"><h2>{t("How to play", "कैसे खेलें")}</h2>
          <ControlsGuide />
          <p className="muted">{t("Start at Cafe Chowk: Babloo Bhaiya (yellow diamond) starts Chapter 1 of Kanupriya\'s story. Coins come only from missions; spend them at Naveen Market. Phones: left joystick, drag to look, buttons on the right.", "कैफ़े चौक से शुरू करो: बबलू भैया (पीला हीरा) कनुप्रिया की कहानी का पहला अध्याय शुरू करेंगे। सिक्के सिर्फ़ मिशन से; नवीन मार्केट में खर्च करो। फ़ोन पर: बायाँ जॉयस्टिक, खींच कर देखो, दायें बटन।")}</p>
          <button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
        {view === "about" && <div className="menu-panel"><h2>Velto Studios</h2>
          <p>{t("Kanpur Chronicles is a free, browser-based single-player open world inspired by Kanpur, made by Velto Studios — a digital product studio from Kanpur that builds websites, apps, AI products and games.", "कानपुर क्रॉनिकल्स कानपुर से प्रेरित एक मुफ़्त ब्राउज़र गेम है, वेल्टो स्टूडियोज़ ने बनाया — कानपुर का डिजिटल प्रोडक्ट स्टूडियो जो वेबसाइट, ऐप, AI प्रोडक्ट और गेम बनाता है।")}</p>
          <p className="muted">{t("Landmarks are fictionalised tributes; no real business or person is depicted. No real-money purchases, no tracking.", "स्थल काल्पनिक श्रद्धांजलि हैं; कोई असली व्यवसाय या व्यक्ति नहीं। कोई असली पैसा नहीं, कोई ट्रैकिंग नहीं।")}</p>
          <p className="muted small">three.js · React Three Fiber · Rapier · Next.js · Local saves · Edge neural voices · Instagram @velto_studios</p>
          <button className="btn" onClick={() => setView("main")}>{t("Back", "वापस")}</button></div>}
      </div>
      <div className="menu-right"><div className="menu-card-art"><div className="art-badge">{t("Public preview", "पब्लिक प्रीव्यू")}</div><ul className="art-list"><li>{t("Real Kanpur streets from OpenStreetMap · railway crossings · Kanpur Central", "OpenStreetMap से असली कानपुर की सड़कें · रेलवे फाटक · कानपुर सेंट्रल")}</li><li>{t("Kanpuriya NPCs with voice + subtitles", "कनपुरिया NPC, आवाज़ + सबटाइटल")}</li><li>{t("8-chapter story starring Kanupriya Tommy · 13 side missions · local autosave", "कनुप्रिया टॉमी की 8 अध्याय की कहानी · 13 साइड मिशन · लोकल ऑटोसेव")}</li></ul></div></div>
    </div>
    <div className="menu-foot muted small">Kanpur Chronicles v1.0 · Velto Studios · {t("Works best in Brave, Chrome or Safari on a laptop; phones supported.", "ब्रेव, क्रोम या सफ़ारी में सबसे अच्छा; फ़ोन भी चलेगा।")}</div>
  </div>;
}

const STAGES: Record<string, [string, string, number]> = { engine: ["Loading engine & world", "इंजन और दुनिया लोड हो रही है", 20], connecting: ["Loading local save", "लोकल सेव लोड हो रहा है", 50], auth: ["Preparing story", "कहानी तैयार हो रही है", 70], joining: ["Preparing city", "शहर तैयार हो रहा है", 90], done: ["Entering Kanpur", "कानपुर में प्रवेश", 100] };
export function LoadingScreen() {
  const en = useStore(s => s.settings.lang === "english"); const stage = useStore(s => s.loadStage ?? "engine"); const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const t0 = Date.now(); const i = setInterval(() => setElapsed((Date.now() - t0) / 1000), 500); return () => clearInterval(i); }, []);
  const st = STAGES[stage] ?? STAGES.engine; const slow = elapsed > 12; const prog = useStore(s => s.loadProgress); const pct = stage === "engine" && prog !== undefined ? Math.round(prog * 0.5) : st[2];
  return <div className="screen center"><Skyline /><StudioMark /><Logo size={56} /><div className="progress"><div className="progress-bar" style={{ width: pct + "%" }} /></div><p className="muted">{en ? st[0] : st[1]}… {pct}%</p><div className="load-steps">{(["engine", "connecting", "auth", "joining", "done"] as const).map(k => <span key={k} className={`ls ${k === stage ? "on" : STAGES[k][2] < st[2] ? "done" : ""}`}>{en ? STAGES[k][0] : STAGES[k][1]}</span>)}</div>
    {slow && <p className="muted small">{en ? "Taking longer than usual. World assets are loading. Your story runs on this device." : "थोड़ा समय लग रहा है। दुनिया के एसेट लोड हो रहे हैं। कहानी इसी डिवाइस पर चलती है।"}</p>}
    {<button className="btn" onClick={() => { net.disconnect(); useStore.getState().set({ screen: "menu" }); }}>{en ? "Back to menu" : "मेन्यू पर वापस"}</button>}
    <Tips /></div>;
}
export function ErrorScreen() { const s = useStore(); const en = s.settings.lang === "english";
  return <div className="screen center"><Skyline /><Logo size={56} /><h2>{en ? "Couldn't start the game" : "गेम शुरू नहीं हो पाया"}</h2><p>{s.errorText}</p>
    <div className="row"><button className="btn btn-accent" onClick={() => { preloadGameEngine(); s.set({ screen: "loading", errorText: undefined, loadStage: "connecting" }); net.connect(net.room); }}>{en ? "Retry" : "फिर कोशिश"}</button><button className="btn" onClick={() => { net.disconnect(); s.set({ screen: "menu" }); }}>{en ? "Back to menu" : "मेन्यू"}</button></div></div>; }
function Tips() { const en = useStore(s => s.settings.lang === "english"); const tips = useMemo(() => en ? ["Press E near anyone to talk.", "Your progress saves automatically on this device.", "Sunset Point is prettiest around 18:00 in-game.", "Space is the handbrake when driving.", "Press I for your inventory, M for the map."] : ["किसी के पास E दबाओ, बात होगी।", "आपकी प्रगति इसी डिवाइस पर अपने आप सेव होती है।", "सनसेट पॉइंट शाम 6 बजे सबसे सुंदर।", "गाड़ी में Space हैंडब्रेक है।", "I से इन्वेंटरी, M से नक्शा।"], [en]); const [i, setI] = useState(0); useEffect(() => { const t = setInterval(() => setI(x => x + 1), 3500); return () => clearInterval(t); }, []); return <p className="tip">{tips[i % tips.length]}</p>; }
