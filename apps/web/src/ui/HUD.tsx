"use client";
/** In-game overlay: stats, mission tracker, interaction prompt, subtitles, toasts, chat, minimap, mobile controls, menus. */
import { useEffect, useRef, useState } from "react";
import { LANDMARKS, ROADS, MISSIONS, SHOP_ITEMS, WORLD_SIZE, type AnimState } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { net } from "../net/client";
import { playerPos, playerYaw } from "../game/Player";
import { input, touchPress, once } from "../game/input";
import { sfx } from "../audio/sfx";
import { DialoguePanel } from "./Dialogue";
import { SettingsPanel } from "./Settings";

export function HUD() {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  const [panel, setPanel] = useState<null | "pause" | "map" | "shop" | "social" | "settings" | "garage" | "help">(null);
  const [showChat, setShowChat] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.code === "Escape") { setPanel(p => p ? null : "pause"); if (document.pointerLockElement) document.exitPointerLock(); }
      if (e.code === "KeyM") setPanel(p => p === "map" ? null : "map"); if (e.code === "Tab") { e.preventDefault(); setPanel(p => p === "social" ? null : "social"); }
      if (e.code === "Enter" || e.code === "KeyT") { setShowChat(true); if (document.pointerLockElement) document.exitPointerLock(); }
      if (e.code === "F1") { e.preventDefault(); setPanel(p => p === "help" ? null : "help"); }
    };
    window.addEventListener("keydown", k);
    const shop = () => setPanel("shop"); const garage = () => setPanel("garage"); window.addEventListener("kv:shop", shop); window.addEventListener("kv:garage", garage);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("kv:shop", shop); window.removeEventListener("kv:garage", garage); };
  }, []);
  useEffect(() => { useStore.getState().set({ paused: !!panel }); }, [panel]);
  const sub = s.subtitle && s.subtitle.until > Date.now() ? s.subtitle : undefined;
  const [, tick] = useState(0); useEffect(() => { const i = setInterval(() => tick(x => x + 1), 250); return () => clearInterval(i); }, []);
  const m = s.mission; const left = m?.def.timeLimitSec ? Math.max(0, m.def.timeLimitSec - (Date.now() - m.startedAt) / 1000) : undefined;
  const online = Object.keys(s.players).length;

  return (
    <div className={`hud ${s.settings.largeText ? "large" : ""} ${s.settings.colorblind ? "cb" : ""}`}>
      {/* top-left stats */}
      <div className="hud-stats">
        <div className="hud-brand">KANPUR<span>VERSE</span></div>
        <div>🪙 {s.profile?.coins ?? 0} · Lv {s.profile?.level ?? 1} · {s.profile?.xp ?? 0} XP</div>
        <div className="muted">{online} online · {s.ping} ms{s.settings.showFps ? ` · ${s.fps} fps` : ""} · {clock(s.worldTime)}</div>
      </div>
      {/* mission tracker */}
      {m && <div className="hud-mission"><b>{t(m.def.name, m.def.nameHi)}</b><div>{t(m.def.desc, m.def.descHi)}</div><div className="muted">{t("Checkpoint", "चेकपॉइंट")} {m.index + 1}/{m.def.checkpoints.length}{left !== undefined && <> · ⏱ {Math.ceil(left)}s</>} · {dist(m.def.checkpoints[m.index])} m</div></div>}
      {/* interaction prompt */}
      {s.nearby && !s.dialogue && <div className="hud-prompt"><kbd>E</kbd> {s.nearby.label}</div>}
      {s.inVehicle && <div className="hud-vehicle">{t("W/S drive · A/D steer · Space brake · H horn · F exit", "W/S चलाओ · A/D मोड़ो · Space ब्रेक · H हॉर्न · F बाहर")}</div>}
      {/* subtitles */}
      {sub && s.settings.subtitles && <div className="hud-sub"><b>{sub.speaker}:</b> {sub.text}{sub.roman && <div className="roman">{sub.roman}</div>}</div>}
      {/* toasts */}
      <div className="hud-toasts">{s.toasts.map(x => <div key={x.id} className={`toast ${x.kind}`}>{x.text}</div>)}</div>
      {/* invites */}
      {s.invites.map(i => <div key={i.from} className="hud-invite">{i.name} {t("invited you to a party", "ने पार्टी में बुलाया")} <button className="btn btn-accent" onClick={() => { net.send({ t: "social", action: "party.accept", target: i.from }); s.set({ invites: s.invites.filter(x => x.from !== i.from) }); }}>{t("Join", "जुड़ो")}</button><button className="btn-ghost" onClick={() => s.set({ invites: s.invites.filter(x => x.from !== i.from) })}>✕</button></div>)}
      <Minimap /> <Chat open={showChat} setOpen={setShowChat} />
      {s.settings.touch && <TouchControls onPause={() => setPanel("pause")} onChat={() => setShowChat(true)} onMap={() => setPanel("map")} />}
      {!s.settings.touch && !panel && <div className="hud-hint muted">{t("Esc menu · M map · Tab social · T chat · 1-6 emotes · F1 help", "Esc मेन्यू · M नक्शा · Tab सोशल · T चैट · 1-6 इमोट · F1 मदद")}</div>}
      <DialoguePanel />
      {panel && <Panel kind={panel} close={() => setPanel(null)} open={setPanel} />}
    </div>
  );
}
const clock = (t: number) => { const h = Math.floor(t * 24), mm = Math.floor((t * 24 - h) * 60); return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };
const dist = (p: [number, number]) => Math.round(Math.hypot(p[0] - playerPos.x, p[1] - playerPos.z));

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0; const draw = () => {
      const { players, selfId, mission, party } = useStore.getState();
      const c = ref.current; if (!c) return; const x = c.getContext("2d")!; const S = c.width; const R = 90; // metres radius
      x.clearRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); x.clip(); x.fillStyle = "rgba(11,11,13,0.7)"; x.fillRect(0, 0, S, S);
      const k = S / (R * 2); x.translate(S / 2, S / 2); x.rotate(-playerYaw.v); x.translate(-playerPos.x * k, -playerPos.z * k);
      x.strokeStyle = "#555"; for (const r of ROADS) { x.lineWidth = r.w * k; x.beginPath(); x.moveTo(r.a[0] * k, r.a[1] * k); x.lineTo(r.b[0] * k, r.b[1] * k); x.stroke(); }
      for (const l of LANDMARKS) { x.fillStyle = l.kind === "lake" ? "#2f6f8f" : l.kind === "park" ? "#3f6f3a" : "#8a8070"; x.beginPath(); x.arc(l.p[0] * k, l.p[1] * k, Math.min(l.r, 40) * k, 0, Math.PI * 2); x.fill(); }
      if (mission) { const cp = mission.def.checkpoints[mission.index]; x.fillStyle = "#ffd23f"; x.beginPath(); x.arc(cp[0] * k, cp[1] * k, 5, 0, Math.PI * 2); x.fill(); }
      for (const p of Object.values(players)) if (p.id !== selfId) { x.fillStyle = party.includes(p.id) ? "#3d8bff" : "#fff"; x.beginPath(); x.arc(p.p[0] * k, p.p[2] * k, 3, 0, Math.PI * 2); x.fill(); }
      x.restore(); x.fillStyle = "#c8102e"; x.beginPath(); x.moveTo(S / 2, S / 2 - 7); x.lineTo(S / 2 - 5, S / 2 + 5); x.lineTo(S / 2 + 5, S / 2 + 5); x.closePath(); x.fill();
      raf = requestAnimationFrame(draw); }; draw(); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={160} height={160} className="hud-minimap" />;
}

function Chat({ open, setOpen }: { open: boolean; setOpen: (b: boolean) => void }) {
  const chat = useStore(s => s.chat); const [text, setText] = useState(""); const inp = useRef<HTMLInputElement>(null); const list = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) inp.current?.focus(); }, [open]); useEffect(() => { list.current?.scrollTo(0, 1e6); }, [chat]);
  const send = () => { const t = text.trim(); if (t) { if (t.startsWith("/")) cmd(t); else net.send({ t: "chat", text: t.slice(0, 160) }); } setText(""); setOpen(false); };
  return <div className={`hud-chat ${open ? "open" : ""}`}><div ref={list} className="chat-list">{chat.slice(-12).map((m, i) => <div key={i} className={m.system ? "sys" : ""}>{m.system ? m.text : <><b>{m.name}:</b> {m.text}</>}</div>)}</div>
    {open && <input ref={inp} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); if (e.key === "Escape") { setOpen(false); setText(""); } }} maxLength={160} placeholder="Say something… (/help)" />}</div>;
}
function cmd(t: string) {
  const s = useStore.getState(); const [c, ...rest] = t.slice(1).split(" "); const target = Object.values(s.players).find(p => p.name.toLowerCase() === (rest[0] ?? "").toLowerCase());
  if (c === "help") return s.pushChat({ from: "sys", name: "", text: "/invite name · /friend name · /mute name · /block name · /report name reason · /leave", at: Date.now(), system: true });
  if (c === "leave") return net.send({ t: "social", action: "party.leave", target: "-" });
  if (!target) return s.toast("Player not found", "error");
  const map: Record<string, string> = { invite: "party.invite", friend: "friend.add", mute: "mute", block: "block", report: "report" };
  if (map[c]) net.send({ t: "social", action: map[c] as never, target: target.id, reason: rest.slice(1).join(" ") || undefined });
}

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
  const B = ({ code, label, cls = "" }: { code: string; label: string; cls?: string }) => <button className={`tbtn ${cls}`} onTouchStart={(e) => { e.preventDefault(); touchPress(code); if (code === "Space") input.jump = true; }} onTouchEnd={() => { if (code === "Space") input.jump = false; }}>{label}</button>;
  return <>
    <div ref={base} className="joy"><div ref={knob} className="joy-knob" /></div>
    <div className="tbtns">
      {nearby && <B code="KeyE" label={inVehicle ? "⏏" : "E"} cls="big accent" />}
      {!inVehicle && <B code="Space" label="⤒" cls="big" />}
      {inVehicle && <B code="KeyH" label="📯" />}{inVehicle && <B code="Space" label="🛑" />}
      <B code="Digit1" label="👋" />
    </div>
    <div className="tbar"><button className="tbtn" onClick={onPause}>☰</button><button className="tbtn" onClick={onMap}>🗺</button><button className="tbtn" onClick={onChat}>💬</button></div>
  </>;
}

function Panel({ kind, close, open }: { kind: string; close: () => void; open: (k: "pause" | "map" | "shop" | "social" | "settings" | "garage" | "help") => void }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  return <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div className="modal-card">
      {kind === "pause" && <><h2>{t("Paused", "रुका हुआ")}</h2>
        <div className="menu-col">
          <button className="btn btn-accent" onClick={close}>{t("Resume", "जारी रखो")}</button>
          <button className="btn" onClick={() => open("map")}>{t("Map", "नक्शा")}</button>
          <button className="btn" onClick={() => open("social")}>{t("Players & party", "खिलाड़ी और पार्टी")}</button>
          <button className="btn" onClick={() => open("settings")}>{t("Settings", "सेटिंग्स")}</button>
          <button className="btn" onClick={() => open("help")}>{t("Controls & help", "कंट्रोल और मदद")}</button>
          {s.mission && <button className="btn" onClick={() => { net.send({ t: "mission.abandon" }); close(); }}>{t("Abandon mission", "मिशन छोड़ो")}</button>}
          <button className="btn-ghost" onClick={() => { net.disconnect(); s.set({ screen: "menu", players: {}, vehicles: {}, mission: undefined, inVehicle: undefined }); }}>{t("Quit to menu", "मेन्यू पर जाओ")}</button>
        </div></>}
      {kind === "map" && <MapPanel close={close} />}
      {kind === "settings" && <><h2>{t("Settings", "सेटिंग्स")}</h2><SettingsPanel /><button className="btn" onClick={close}>{t("Back", "वापस")}</button></>}
      {kind === "help" && <><h2>{t("Controls", "कंट्रोल")}</h2><div className="help-grid">
        <div><kbd>W A S D</kbd> {t("move", "चलो")}</div><div><kbd>Shift</kbd> {t("sprint", "दौड़ो")}</div><div><kbd>Space</kbd> {t("jump / brake", "कूदो / ब्रेक")}</div><div><kbd>Mouse</kbd> {t("look (click to lock)", "कैमरा (क्लिक करो)")}</div>
        <div><kbd>E</kbd> {t("talk / enter / photo", "बात / चढ़ो / फ़ोटो")}</div><div><kbd>F</kbd> {t("exit vehicle", "गाड़ी से उतरो")}</div><div><kbd>H</kbd> {t("horn", "हॉर्न")}</div><div><kbd>1–6</kbd> {t("emotes: wave, dance, laugh, celebrate, high-five, sit", "इमोट: हाथ हिलाओ, डांस, हँसो, जश्न, हाई-फाइव, बैठो")}</div>
        <div><kbd>T</kbd> {t("chat", "चैट")}</div><div><kbd>M</kbd> {t("map", "नक्शा")}</div><div><kbd>Tab</kbd> {t("players", "खिलाड़ी")}</div><div><kbd>Esc</kbd> {t("menu", "मेन्यू")}</div></div>
        <p className="muted">{t("Find Babloo Bhaiya at Cafe Chowk for your first mission. Yellow diamonds mark mission givers.", "पहले मिशन के लिए कैफ़े चौक पर बबलू भैया से मिलो। पीले हीरे मिशन देने वालों को दिखाते हैं।")}</p>
        <button className="btn" onClick={close}>{t("Back", "वापस")}</button></>}
      {kind === "social" && <SocialPanel close={close} />}
      {kind === "shop" && <ShopPanel close={close} />}
      {kind === "garage" && <GaragePanel close={close} />}
    </div>
  </div>;
}

function MapPanel({ close }: { close: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null); const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  useEffect(() => { const c = ref.current!; const x = c.getContext("2d")!; const S = c.width; const k = S / (WORLD_SIZE + 60); x.fillStyle = "#1c1d22"; x.fillRect(0, 0, S, S); x.save(); x.translate(S / 2, S / 2);
    x.fillStyle = "#2f6f8f"; x.fillRect(-S, -S / 2 - (WORLD_SIZE / 2 - 10) * k - 200, 2 * S, 200); // river
    for (const l of LANDMARKS) { x.fillStyle = l.kind === "lake" ? "#2f6f8f" : l.kind === "park" ? "#3f6f3a" : l.kind === "ghat" ? "#c9b79c" : "#5a5248"; x.beginPath(); x.arc(l.p[0] * k, l.p[1] * k, Math.min(l.r, 45) * k, 0, Math.PI * 2); x.fill(); }
    x.strokeStyle = "#777"; for (const r of ROADS) { x.lineWidth = Math.max(2, r.w * k); x.beginPath(); x.moveTo(r.a[0] * k, r.a[1] * k); x.lineTo(r.b[0] * k, r.b[1] * k); x.stroke(); }
    x.fillStyle = "#fff"; x.font = "11px Inter, system-ui"; x.textAlign = "center"; for (const l of LANDMARKS) if (l.kind !== "park") x.fillText(s.settings.lang === "english" ? l.name : l.nameHi, l.p[0] * k, l.p[1] * k - 4);
    for (const m of MISSIONS) if (!s.profile?.missionsCompleted.includes(m.id)) { x.fillStyle = "#ffd23f"; x.beginPath(); x.arc(m.start[0] * k, m.start[1] * k, 4, 0, Math.PI * 2); x.fill(); }
    if (s.mission) { const cp = s.mission.def.checkpoints[s.mission.index]; x.strokeStyle = "#ffd23f"; x.lineWidth = 2; x.beginPath(); x.arc(cp[0] * k, cp[1] * k, 8, 0, Math.PI * 2); x.stroke(); }
    for (const p of Object.values(s.players)) { x.fillStyle = p.id === s.selfId ? "#c8102e" : "#3d8bff"; x.beginPath(); x.arc(p.p[0] * k, p.p[2] * k, 4, 0, Math.PI * 2); x.fill(); }
    x.restore(); }, [s]);
  return <><h2>{t("Kanpur — Civil Lines & Moti Jheel", "कानपुर — सिविल लाइंस और मोती झील")}</h2><canvas ref={ref} width={520} height={520} className="bigmap" /><p className="muted">{t("Fictionalised tribute to central Kanpur. Yellow dots: missions.", "मध्य कानपुर को काल्पनिक श्रद्धांजलि। पीले बिंदु: मिशन।")}</p><button className="btn" onClick={close}>{t("Close", "बंद")}</button></>;
}

function SocialPanel({ close }: { close: () => void }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi; const others = Object.values(s.players).filter(p => p.id !== s.selfId);
  const act = (action: string, target: string) => { net.send({ t: "social", action: action as never, target, reason: action === "report" ? "in-game report" : undefined }); sfx.ui(); };
  return <><h2>{t("Players", "खिलाड़ी")} ({others.length + 1})</h2>
    {s.party.length > 1 && <p>{t("Party", "पार्टी")}: {s.party.map(id => s.players[id]?.name ?? (id === s.selfId ? s.name : "?")).join(", ")} <button className="btn-ghost" onClick={() => act("party.leave", "-")}>{t("Leave", "छोड़ो")}</button></p>}
    <div className="plist">{others.length === 0 && <p className="muted">{t("No one else here yet. Share the link!", "अभी कोई और नहीं। लिंक शेयर करो!")}</p>}
      {others.map(p => <div key={p.id} className="prow"><span><b>{p.name}</b> <small className="muted">Lv {p.level} · {Math.round(Math.hypot(p.p[0] - playerPos.x, p.p[2] - playerPos.z))} m</small></span>
        <span><button className="btn-sm" onClick={() => act("party.invite", p.id)}>{t("Invite", "बुलाओ")}</button><button className="btn-sm" onClick={() => act(s.profile?.friends.includes(p.id) ? "friend.remove" : "friend.add", p.id)}>{s.profile?.friends.includes(p.id) ? "★" : "☆"}</button><button className="btn-sm" onClick={() => act("mute", p.id)}>🔇</button><button className="btn-sm" onClick={() => act(s.profile?.blocked.includes(p.id) ? "unblock" : "block", p.id)}>{s.profile?.blocked.includes(p.id) ? t("Unblock", "अनब्लॉक") : t("Block", "ब्लॉक")}</button><button className="btn-sm danger" onClick={() => act("report", p.id)}>⚑</button></span></div>)}</div>
    <p className="muted">{t("Couples & friends: sit together at Cafe Chowk, walk the Moti Jheel loop, race Mall Road, or do the photo walk. Party members get bonus rewards.", "जोड़े और दोस्त: कैफ़े चौक पर साथ बैठो, मोती झील का चक्कर लगाओ, मॉल रोड रेस करो, या फ़ोटो वॉक। पार्टी वालों को बोनस।")}</p>
    <button className="btn" onClick={close}>{t("Close", "बंद")}</button></>;
}

function ShopPanel({ close }: { close: () => void }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  const equip = (slot: string, value: number) => { const a = { ...s.appearance, [slot]: value } as typeof s.appearance; s.set({ appearance: a }); s.saveLocal(); net.send({ t: "profile.update", appearance: a }); };
  return <><h2>{t("Naveen Market", "नवीन मार्केट")} · 🪙 {s.profile?.coins}</h2><div className="shop">
    {SHOP_ITEMS.map(it => { const owned = s.profile?.unlocked.includes(it.id); return <div key={it.id} className="shop-item"><b>{t(it.name, it.nameHi)}</b><span>{owned ? t("Owned", "आपका") : `${it.price} 🪙`}</span>
      {owned ? (it.slot === "top" || it.slot === "accessory") ? <button className="btn-sm" onClick={() => equip(it.slot, it.value)}>{t("Wear", "पहनो")}</button> : <span className="muted">✓</span> : <button className="btn-sm accent" onClick={() => { net.send({ t: "shop.buy", item: it.id }); sfx.coin(); }}>{t("Buy", "खरीदो")}</button>}</div>; })}
  </div><p className="muted">{t("Coins come from missions only. No real money anywhere in KanpurVerse.", "सिक्के सिर्फ़ मिशन से मिलते हैं। कानपुरवर्स में असली पैसा कहीं नहीं।")}</p><button className="btn" onClick={close}>{t("Close", "बंद")}</button></>;
}
function GaragePanel({ close }: { close: () => void }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi;
  return <><h2>{t("Rawatpur Garage", "रावतपुर गैराज")}</h2><p>{t("Vehicles parked here: sedan, SUV and bike. Walk up to one and press E. Vehicles are shared in the world — if someone is driving, you can ride along as a passenger.", "यहाँ सेडान, एसयूवी और बाइक खड़ी हैं। पास जाकर E दबाओ। गाड़ियाँ सबकी हैं — कोई चला रहा हो तो सवारी बन जाओ।")}</p>
    <p className="muted">{t("Vehicle colours and upgrades: planned, not in this build.", "गाड़ी के रंग और अपग्रेड: योजना में, इस बिल्ड में नहीं।")}</p><button className="btn" onClick={close}>{t("Close", "बंद")}</button></>;
}
void once; void (0 as unknown as AnimState);
