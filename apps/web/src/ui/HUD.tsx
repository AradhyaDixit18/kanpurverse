"use client";
/** In-game overlay: stats, mission tracker, interaction prompt, subtitles, toasts, minimap, mobile controls, menus. */
import { useShallow } from "zustand/react/shallow";
import { useEffect, useRef, useState } from "react";
import { LANDMARKS, MISSIONS, SHOP_ITEMS, VEHICLE_SPECS, chapterFor, nextChapter, storyUnlocked, sideMissionsOpen, type AnimState } from "@kanpurverse/shared";
import { getRoads, roadsNear } from "../game/roads";
import { camYaw } from "../game/input";
import { useStore, tl } from "../state/store";
import { net } from "../net/client";
import { playerPos, playerYaw } from "../game/refs";
import { input, touchPress, once } from "../game/input";
import { sfx } from "../audio/sfx";
import { DialoguePanel } from "./Dialogue";
import { Cutscene, Credits } from "./Story";
import { ControlsGuide } from "./Controls";
import { Minimap, Guidance, WorldMap } from "./MapUI";
import { ShopPanel } from "./ShopPanel";
import { StatusBars, VehicleNotice, KnockOut, InventoryPanel } from "./StatusHud";
import { vehicleTelemetry } from "../game/refs";
import { driftHud } from "../game/Vehicles";
import { Logo } from "./Brand";
import { SettingsPanel } from "./Settings";

export function HUD() {
  const s = useStore(useShallow(s => ({ settings:s.settings, saveState:s.saveState, lastSavedAt:s.lastSavedAt, profile:s.profile, missionResult:s.missionResult, health:s.health, subtitle:s.subtitle, mission:s.mission, fps:s.fps, timeLabel:clock(s.worldTime), nearby:s.nearby, dialogue:s.dialogue, inVehicle:s.inVehicle, seat:s.seat, toasts:s.toasts, set:s.set }))); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  const [panel, setPanel] = useState<null | "pause" | "map" | "shop" | "settings" | "garage" | "help" | "inventory" | "quests">(null); const [photo, setPhoto] = useState(false);
  
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.code === "Escape" && useStore.getState().dialogue) return;
      if (e.code === "Escape") { setPanel(p => p ? null : "pause"); if (document.pointerLockElement) document.exitPointerLock(); }
      if (e.code === "KeyM") setPanel(p => p === "map" ? null : "map"); 
      
      if (e.code === "F1") { e.preventDefault(); setPanel(p => p === "help" ? null : "help"); }
      if (e.code === "KeyI") setPanel(p => p === "inventory" ? null : "inventory");
      if (e.code === "KeyJ") setPanel(p => p === "quests" ? null : "quests");
      if (e.code === "KeyP") setPhoto(v => !v);
    };
    window.addEventListener("keydown", k);
    const shop = () => setPanel("shop"); const garage = () => setPanel("garage"); window.addEventListener("kv:shop", shop); window.addEventListener("kv:garage", garage);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("kv:shop", shop); window.removeEventListener("kv:garage", garage); };
  }, []);
  useEffect(() => { useStore.getState().set({ paused: !!panel }); }, [panel]);
  const sub = s.subtitle && s.subtitle.until > Date.now() ? s.subtitle : undefined;
  const [, tick] = useState(0); useEffect(() => { const i = setInterval(() => tick(x => x + 1), 250); return () => clearInterval(i); }, []);
  const m = s.mission; const left = m?.def.timeLimitSec ? Math.max(0, m.def.timeLimitSec - (Date.now() - m.startedAt) / 1000) : undefined;
  

  if (photo) return <div className="hud photo"><div className="photo-hint">{t("Photo mode — P to exit · drag to look · wheel to zoom", "फ़ोटो मोड — P से बाहर · देखने के लिए खींचो · ज़ूम के लिए व्हील")}</div><Compass /></div>;
  return (
    <div className={`hud ${s.settings.largeText ? "large" : ""} ${s.settings.colorblind ? "cb" : ""}`}>
      {s.missionResult && !useStore.getState().dead && <div className="story-result" role="status"><small>VELTO STUDIOS · KANPUR CHRONICLES</small><h2>{s.missionResult.success ? (chapterFor(s.missionResult.id) ? t("CHAPTER COMPLETE", "अध्याय पूरा") : t("MISSION PASSED", "मिशन पूरा")) : t("MISSION FAILED", "मिशन फेल")}</h2><p>{(() => { const md = MISSIONS.find(m=>m.id===s.missionResult?.id); return md ? t(md.name, md.nameHi) : ""; })()}</p><p>{s.missionResult.success ? `+${s.missionResult.coins} 🪙 · +${s.missionResult.xp} XP` : "मिशन देने वाले से फिर मिलो।"}</p><button className="btn" onClick={()=>s.set({missionResult:undefined})}>{t("Continue", "आगे चलो")}</button></div>}
      <Compass />
      <Guidance />
      {/* top-left stats */}
      <div className="hud-stats">
        <Logo size={14} /><small aria-live="polite">{s.saveState === "error" ? "⚠ सेव नहीं हुआ" : s.lastSavedAt ? "✓ इस डिवाइस पर सेव" : ""}</small>
        <div className="story-chip">{(() => { const n = nextChapter(s.profile?.missionsCompleted ?? []); return n ? t(`Chapter ${n.n}/8 · ${n.title}`, `अध्याय ${n.n}/8 · ${n.titleHi}`) : t("Story complete · free roam", "कहानी पूरी · खुला शहर"); })()}</div>
        <div>₹{(s.profile?.coins ?? 0).toLocaleString("en-IN")} · Lv {s.profile?.level ?? 1} · {s.profile?.xp ?? 0} XP</div>
        <div className="muted">{t("SOLO STORY", "एकल कहानी")}{s.settings.showFps ? ` · ${s.fps} fps` : ""} · 🕒 {s.timeLabel} {t("Kanpur", "कानपुर")}</div>
  {!s.inVehicle && !s.dialogue && !panel && <div className="street-tools"><span>Gutka / गुटखा ×{s.profile?.inventory?.gutka ?? 0}</span><button className="btn-sm" onClick={() => touchPress("KeyG")}>G · सेवन</button><button className="btn-sm" onClick={() => touchPress("KeyV")}>V · थूकना</button><small>नागरिक स्कोर {s.profile?.civic ?? 100}/100</small></div>}
      </div>
      {/* mission tracker */}
      {m && <div className="hud-mission"><b>{t(m.def.name, m.def.nameHi)}</b><div>{(() => { const ch = chapterFor(m.def.id); const o = ch?.objectives[m.index]; return o ? t(o[1], o[0]) : t(m.def.desc, m.def.descHi); })()}</div><div className="muted">{t("Checkpoint", "चेकपॉइंट")} {m.index + 1}/{m.def.checkpoints.length}{left !== undefined && <> · ⏱ {Math.ceil(left)}s</>} · {dist(m.def.checkpoints[m.index])} m</div></div>}
      {/* interaction prompt */}
      {s.nearby && !s.dialogue && !(s.inVehicle && s.nearby.kind === "vehicle") && <div className="hud-prompt"><kbd>E</kbd> {s.nearby.label}</div>}
      {s.inVehicle && s.seat === "driver" && <Speedo />}
      {s.inVehicle && <div className="hud-vehicle">{t("W/S throttle · brake · A/D steer · Space handbrake · L lights · H horn · F exit", "W/S रफ़्तार · ब्रेक · A/D मोड़ो · Space हैंडब्रेक · L लाइट · H हॉर्न · F उतरो")}</div>}
      {/* subtitles */}
      {sub && s.settings.subtitles && <div className="hud-sub"><b>{sub.speaker}:</b> {sub.text}{sub.roman && s.settings.englishSubs && <div className="roman">{sub.roman}</div>}</div>}
      {/* toasts */}
      <div className="hud-toasts">{s.toasts.map(x => <div key={x.id} className={`toast ${x.kind}`}>{x.text}</div>)}</div>
      <Minimap />
      {s.settings.touch && <TouchControls onPause={() => setPanel("pause")} onChat={() => setPanel("quests")} onMap={() => setPanel("map")} />}
      {!s.settings.touch && !panel && <div className="hud-hint muted">{t("Esc menu · M map · 1-6 emotes · F1 help", "Esc मेन्यू · M नक्शा · 1-6 इमोट · F1 मदद")}</div>}
      <DialoguePanel />
      <ShopPanel />
      <StatusBars />
      <VehicleNotice />
      <KnockOut />
      <Cutscene />
      <Credits />
      {panel && <Panel kind={panel} close={() => setPanel(null)} open={setPanel} />}
    </div>
  );
}
function Speedo() { const [t, setT] = useState({ v: 0, name: "", rev: false, ind: 0, hl: "auto", cond: 100 }); useEffect(() => { const i = setInterval(() => { const s = useStore.getState(); setT({ v: Math.round(vehicleTelemetry.speed * 3.6), name: vehicleTelemetry.name, rev: vehicleTelemetry.reverse, ind: vehicleTelemetry.indicator, hl: s.settings.headlights ?? "auto", cond: (() => { const id = s.inVehicle; const vh = id ? s.game.vehicleHealth[id] : undefined; return vh ? Math.round(Math.min(vh.engine, vh.body)) : 100; })() }); }, 100); return () => clearInterval(i); }, []);
  const max = Math.max(60, Math.round((SPECS_KMH[vehicleTelemetry.kind] ?? 120) / 20) * 20); const a = -120 + Math.min(1, t.v / max) * 240;
  return <div className="hud-speedo v2" aria-label={`${t.v} km/h`}><svg viewBox="0 0 120 80" className="speedo-dial"><path d="M14 70 A50 50 0 1 1 106 70" stroke="#ffffff22" strokeWidth="6" fill="none" /><path d="M14 70 A50 50 0 1 1 106 70" stroke="#e5c17b" strokeWidth="6" fill="none" strokeDasharray={`${Math.min(1, t.v / max) * 236} 400`} /><line x1="60" y1="60" x2="60" y2="22" stroke="#ff5a3c" strokeWidth="2.5" transform={`rotate(${a} 60 60)`} /></svg>
    <b>{t.v}</b><small>km/h · {t.rev ? "R" : t.v > 0 ? "D" : "N"}</small><div className="speedo-meta"><span className={t.ind === -1 || t.ind === 2 ? "ind on" : "ind"}>◀</span><span title="Headlights">💡{t.hl === "auto" ? "A" : t.hl === "on" ? "●" : "○"}</span><span title="Condition">🔧{t.cond}%</span><span className={t.ind === 1 || t.ind === 2 ? "ind on" : "ind"}>▶</span></div><div className="speedo-name">{t.name}</div>{driftHud.active && <div className="drift-score">{useStore.getState().settings.lang === "english" ? "DRIFT" : "ड्रिफ्ट"} {driftHud.score}</div>}</div>; }
const SPECS_KMH: Record<string, number> = Object.fromEntries(Object.entries(VEHICLE_SPECS).map(([k, v]) => [k, v.max * 3.6]));
function Compass() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { let raf = 0; const draw = () => { const c = ref.current; if (!c) return; const x = c.getContext("2d")!; const W = c.width, H = c.height; x.clearRect(0, 0, W, H);
    const { mission, settings } = useStore.getState(); const yaw = camYaw.v; const en = settings.lang === "english"; const pxPerRad = W / (Math.PI * 1.2);
    const used: number[] = []; // label centres already drawn (px); nearby labels are skipped so the strip never overlaps
    const mark = (ang: number, label: string, col: string, big = false, spacing = 0) => { let d = ang - yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.abs(d) > Math.PI * 0.6) return; const px = W / 2 - d * pxPerRad; if (spacing && used.some(u => Math.abs(u - px) < spacing)) return; used.push(px); x.fillStyle = col; x.font = `${big ? "bold 13px" : "11px"} Inter, system-ui`; x.textAlign = "center"; x.fillText(label, px, 14); x.fillRect(px - 1, 22, 2, 6); };
    // cardinal: world +Z is south; camera yaw 0 looks toward -Z (north)
    mark(0, "N", "#fff", true); mark(Math.PI / 2, "W", "#bbb"); mark(Math.PI, "S", "#bbb"); mark(-Math.PI / 2, "E", "#bbb");
    if (mission) { const cp = mission.def.checkpoints[mission.index]; const dx = cp[0] - playerPos.x, dz = cp[1] - playerPos.z; mark(Math.atan2(-dx, -dz), `◆ ${Math.round(Math.hypot(dx, dz))} m`, "#ff5a3c", true, 1); }
    const near = LANDMARKS.filter(l => l.kind !== "park" || l.id === "nana_rao").map(l => ({ l, dx: l.p[0] - playerPos.x, dz: l.p[1] - playerPos.z })).map(o => ({ ...o, dist: Math.hypot(o.dx, o.dz) })).filter(o => o.dist < 1800).sort((a, b) => a.dist - b.dist).slice(0, 4);
    for (const { l, dx, dz, dist } of near) mark(Math.atan2(-dx, -dz), (en ? l.name : l.nameHi) + (dist > 120 ? ` ${Math.round(dist)}m` : ""), "#ffd23f", false, 92);
    x.fillStyle = "rgba(255,255,255,.5)"; x.fillRect(W / 2 - 1, 0, 2, 8); raf = requestAnimationFrame(draw); }; draw(); return () => cancelAnimationFrame(raf); }, []);
  return <canvas ref={ref} width={560} height={34} className="hud-compass" />;
}
const clock = (t: number) => { const h = Math.floor(t * 24), mm = Math.floor((t * 24 - h) * 60); return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };
const dist = (p: [number, number]) => Math.round(Math.hypot(p[0] - playerPos.x, p[1] - playerPos.z));

const TouchButton = ({ code, label, cls = "" }: { code: string; label: string; cls?: string }) => <button aria-label={label === "⏏" ? "Exit vehicle" : label === "🛑" ? "Brake" : label === "⤒" ? "Jump" : label} className={`tbtn ${cls}`} onClick={() => touchPress(code)} onTouchStart={(e) => { e.preventDefault(); touchPress(code); if (code === "Space") input.touch.jump = true; }} onTouchEnd={() => { if (code === "Space") input.touch.jump = false; }} onTouchCancel={() => { if (code === "Space") input.touch.jump = false; }}>{label}</button>;

function TouchControls({ onPause, onChat, onMap }: { onPause: () => void; onChat: () => void; onMap: () => void }) {
  const base = useRef<HTMLDivElement>(null); const knob = useRef<HTMLDivElement>(null); const joyId = useRef<number | null>(null); const lookId = useRef<number | null>(null); const last = useRef({ x: 0, y: 0 });
  const nearby = useStore(s => s.nearby); const inVehicle = useStore(s => s.inVehicle);
  useEffect(() => {
    const el = document.body;
    const start = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) { if (t.clientX < window.innerWidth * 0.4 && t.clientY > window.innerHeight * 0.45 && joyId.current === null) { joyId.current = t.identifier; move(e); } else if ((e.target as HTMLElement).tagName === "CANVAS" && lookId.current === null) { lookId.current = t.identifier; last.current = { x: t.clientX, y: t.clientY }; input.touch.lookActive = true; } } };
    const move = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) { if (t.identifier === joyId.current && base.current && knob.current) { const r = base.current.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } input.touch.joy = { x: dx, y: dy }; knob.current.style.transform = `translate(${dx * 36}px,${dy * 36}px)`; } else if (t.identifier === lookId.current) { input.look.dx += (t.clientX - last.current.x) * 2.2; input.look.dy += (t.clientY - last.current.y) * 2.2; last.current = { x: t.clientX, y: t.clientY }; } } };
    const end = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) { if (t.identifier === joyId.current) { joyId.current = null; input.touch.joy = { x: 0, y: 0 }; if (knob.current) knob.current.style.transform = ""; } if (t.identifier === lookId.current) lookId.current = null; } };
    el.addEventListener("touchstart", start, { passive: true }); el.addEventListener("touchmove", move, { passive: true }); el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, []);

  return <>
    <div ref={base} className="joy"><div ref={knob} className="joy-knob" /></div>
    <div className="tbtns">
      {(nearby || inVehicle) && <TouchButton code="KeyE" label={inVehicle ? "⏏" : "E"} cls="big accent" />}
      {!inVehicle && <TouchButton code="Space" label="⤒" cls="big" />}
      {inVehicle && <TouchButton code="KeyH" label="📯" />}{inVehicle && <TouchButton code="Space" label="🛑" />}
      <TouchButton code="Digit1" label="👋" />
    </div>
    <div className="tbar"><button className="tbtn" onClick={onPause}>☰</button><button className="tbtn" onClick={onMap}>🗺</button><button className="tbtn" onClick={onChat}>◆</button></div>
  </>;
}

function Panel({ kind, close, open }: { kind: string; close: () => void; open: (k: "pause" | "map" | "shop" | "settings" | "garage" | "help" | "inventory" | "quests") => void }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  return <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div className={`modal-card ${kind === "map" ? "modal-map" : ""}`}>
      {kind === "pause" && <><h2>{t("Paused", "रुका हुआ")}</h2>
        <div className="menu-col">
          <button className="btn btn-accent" onClick={close}>{t("Resume", "जारी रखो")}</button>
          <button className="btn" onClick={() => open("map")}>{t("Map", "नक्शा")}</button>
          <button className="btn" onClick={() => { if(net.save()) s.toast(t("Game saved on this device", "गेम इसी डिवाइस पर सेव हुआ")); }}>{t("Save game", "गेम सेव करो")}</button>
          <button className="btn" onClick={() => open("quests")}>{t("Missions log", "मिशन लॉग")}</button>
          <button className="btn" onClick={() => open("inventory")}>{t("Inventory & character", "इन्वेंटरी और किरदार")}</button>
          <button className="btn" onClick={() => open("settings")}>{t("Settings", "सेटिंग्स")}</button>
          <button className="btn" onClick={() => open("help")}>{t("Controls & help", "कंट्रोल और मदद")}</button>
          {s.mission && <button className="btn" onClick={() => { net.send({ t: "mission.abandon" }); close(); }}>{t("Abandon mission", "मिशन छोड़ो")}</button>}
          <button className="btn-ghost" onClick={() => { net.disconnect(); s.set({ screen: "menu", players: {}, vehicles: {}, mission: undefined, inVehicle: undefined }); }}>{t("Quit to menu", "मेन्यू पर जाओ")}</button>
        </div></>}
      {kind === "map" && <WorldMap close={close} />}
      {kind === "settings" && <><h2>{t("Settings", "सेटिंग्स")}</h2><SettingsPanel /><button className="btn" onClick={close}>{t("Back", "वापस")}</button></>}
      {kind === "help" && <><h2>{t("Controls", "कंट्रोल")}</h2><ControlsGuide />
        <p className="muted">{t("Find Babloo Bhaiya at Cafe Chowk for your first mission. Yellow diamonds mark mission givers.", "पहले मिशन के लिए कैफ़े चौक पर बबलू भैया से मिलो। पीले हीरे मिशन देने वालों को दिखाते हैं।")}</p>
        <button className="btn" onClick={close}>{t("Back", "वापस")}</button></>}

      {kind === "quests" && <QuestPanel close={close} />}
      {kind === "shop" && <LegacyMarket close={close} />}
      {kind === "inventory" && <InventoryPanel close={close} />}
      {kind === "garage" && <GaragePanel close={close} />}
    </div>
  </div>;
}

function QuestPanel({ close }: { close: () => void }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi; const done = s.profile?.missionsCompleted ?? [];
  return <><h2>{t("Missions", "मिशन")} · {done.length}/{MISSIONS.length}</h2><div className="plist">{MISSIONS.map(m => { const d = Math.round(Math.hypot(m.start[0] - playerPos.x, m.start[1] - playerPos.z)); const active = s.mission?.def.id === m.id; return <div key={m.id} className={`prow ${active ? "active" : ""}`}><span><b>{t(m.name, m.nameHi)}</b> <small className="muted">{m.kind}{m.needsVehicle ? " · 🚗" : ""} · {d} m</small><div className="muted small">{t(m.desc, m.descHi)}</div></span><span>{done.includes(m.id) ? "✅" : active ? "▶" : <>+₹{m.reward.coins} <button className="btn-sm" onClick={() => { s.set({ waypoint: { p: m.start, label: t(m.name, m.nameHi) }, route: undefined }); close(); }}>{t("GPS", "रास्ता")}</button></>}</span></div>; })}</div><p className="muted">{t("Yellow diamonds in the world and ◆ on the compass mark mission givers and objectives.", "दुनिया में पीले हीरे और कंपास पर ◆ मिशन देने वालों और लक्ष्यों को दिखाते हैं।")}</p><button className="btn" onClick={close}>{t("Close", "बंद")}</button></>;
}

function LegacyMarket({ close, inventory }: { close: () => void; inventory?: boolean }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  const equip = (slot: string, value: number) => { const a = { ...s.appearance, [slot]: value } as typeof s.appearance; s.set({ appearance: a }); s.saveLocal(); net.send({ t: "profile.update", appearance: a }); };
  const items = inventory ? SHOP_ITEMS.filter(i => s.profile?.unlocked.includes(i.id)) : SHOP_ITEMS;
  return <><h2>{inventory ? t("Inventory", "इन्वेंटरी") : t("Naveen Market", "नवीन मार्केट")} · 🪙 {s.profile?.coins}</h2>{inventory && <p className="muted">{t("Basic outfits are always available in Character. Items bought at Naveen Market appear here.", "बेसिक कपड़े हमेशा किरदार में हैं। नवीन मार्केट से खरीदी चीज़ें यहाँ दिखेंगी।")}</p>}{inventory && items.length === 0 && <p>{t("Nothing yet — earn coins from missions and visit Naveen Market.", "अभी कुछ नहीं — मिशन से सिक्के कमाओ और नवीन मार्केट जाओ।")}</p>}<div className="shop">
    {items.map(it => { const owned = s.profile?.unlocked.includes(it.id); return <div key={it.id} className="shop-item"><b>{t(it.name, it.nameHi)}</b><span>{owned ? t("Owned", "आपका") : `${it.price} 🪙`}</span>
      {owned ? (it.slot === "top" || it.slot === "accessory") ? <button className="btn-sm" onClick={() => equip(it.slot, it.value)}>{t("Wear", "पहनो")}</button> : <span className="muted">✓</span> : <button className="btn-sm accent" onClick={() => { net.send({ t: "shop.buy", item: it.id }); sfx.coin(); }}>{t("Buy", "खरीदो")}</button>}</div>; })}
  </div>{inventory && <p>Gutka / गुटखा ×{s.profile?.inventory?.gutka ?? 0} · G से सेवन · V से थूकना · नुक्कड़ पान चाचा, मॉल रोड</p>}<p className="muted">{t("Coins come from missions only. No real money anywhere in KanpurVerse.", "सिक्के सिर्फ़ मिशन से मिलते हैं। कानपुरवर्स में असली पैसा कहीं नहीं।")}</p><button className="btn" onClick={close}>{t("Close", "बंद")}</button></>;
}
function GaragePanel({ close }: { close: () => void }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  return <><h2>{t("Rawatpur Garage", "रावतपुर गैराज")}</h2><p>{t("All city vehicles are available for solo exploration. Your own scooter is registered from the start; finish Laddoo Ka Chakkar to earn the hatchback.", "शहर की गाड़ियाँ अकेले चलाओ। स्कूटर अपना है; लड्डू का चक्कर पूरा करने पर हैचबैक मिलेगी।")}</p>
    <p>{t("Owned vehicles", "अपनी गाड़ियाँ")}: {s.ownedVehicles.join(", ")}</p><p className="muted">{t("Vehicle colours and upgrades: planned, not in this build.", "गाड़ी के रंग और अपग्रेड: योजना में, इस बिल्ड में नहीं।")}</p><button className="btn" onClick={close}>{t("Close", "बंद")}</button></>;
}
void once; void (0 as unknown as AnimState);
