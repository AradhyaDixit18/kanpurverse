"use client";
/**
 * Navigation UI: points of interest from real world coordinates, the rotating minimap with the GPS route, turn-by-turn
 * guidance, and a full-screen map with pan, zoom, selection and "set route".
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { LANDMARKS, MISSIONS, SHOPS, chapterFor, storyUnlocked, sideMissionsOpen, type MissionDef } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { getRoads, roadsNear, getGeo } from "../game/roads";
import { playerPos, playerYaw } from "../game/refs";
import { guidance } from "../game/gps";

export type PoiKind = "main" | "side" | "locked" | "done" | "weapons" | "clothing" | "garage" | "hospital" | "dealership" | "landmark" | "ghat" | "vehicle" | "safe" | "objective";
export interface Poi { id: string; kind: PoiKind; p: [number, number]; hi: string; en: string; descHi?: string; desc?: string; mission?: MissionDef }
const COLOR: Record<PoiKind, string> = { main: "#ffc83d", side: "#4fa3ff", locked: "#6b6f78", done: "#5fc27a", weapons: "#e5483a", clothing: "#c46bff", garage: "#ff9a3c", hospital: "#ffffff", dealership: "#3dd6c4", landmark: "#d9c9a8", ghat: "#6fc3ff", vehicle: "#9ad0ff", safe: "#8be38b", objective: "#ffc83d" };
const GLYPH: Partial<Record<PoiKind, string>> = { main: "★", side: "◆", locked: "🔒", done: "✓", weapons: "⚔", clothing: "👗", garage: "🔧", hospital: "✚", dealership: "🚗", ghat: "≈", vehicle: "▣", safe: "⌂", objective: "◎" };

export function usePois(): Poi[] {
  const done = useStore(s => s.profile?.missionsCompleted); const vehicles = useStore(s => s.vehicles); const mission = useStore(s => s.mission); const bought = useStore(s => s.game.boughtVehicles);
  return useMemo(() => {
    const d = done ?? []; const out: Poi[] = [];
    for (const m of MISSIONS) { const ch = chapterFor(m.id); const open = ch ? storyUnlocked(m.id, d) : sideMissionsOpen(d); const kind: PoiKind = d.includes(m.id) ? "done" : !open ? "locked" : ch ? "main" : "side";
      out.push({ id: "m:" + m.id, kind, p: m.start, hi: m.nameHi, en: m.name, descHi: m.descHi, desc: m.desc, mission: m }); }
    for (const s of SHOPS) out.push({ id: "s:" + s.id, kind: s.type === "hospital" ? "hospital" : s.type === "garage" ? "garage" : s.type === "dealership" ? "dealership" : s.type === "clothing" ? "clothing" : "weapons", p: s.p, hi: s.nameHi, en: s.name });
    for (const l of LANDMARKS) if (l.kind !== "cafe" && l.kind !== "viewpoint") out.push({ id: "l:" + l.id, kind: l.kind === "ghat" ? "ghat" : "landmark", p: l.p, hi: l.nameHi, en: l.name, descHi: l.blurbHi, desc: l.blurb });
    out.push({ id: "safe", kind: "safe", p: [456, -345], hi: "सेफ़ हाउस (सेव + आराम)", en: "Safe house (save & heal)" });
    for (const k of bought) { const v = vehicles[`own_${k}`]; if (v) out.push({ id: "v:" + v.id, kind: "vehicle", p: [v.p[0], v.p[2]], hi: "आपकी गाड़ी", en: "Your vehicle" }); }
    if (mission) { const cp = mission.def.checkpoints[mission.index]; if (cp) out.push({ id: "obj", kind: "objective", p: cp, hi: "मिशन का लक्ष्य", en: "Mission objective" }); }
    return out;
  }, [done, vehicles, mission, bought]);
}
function drawPoi(x: CanvasRenderingContext2D, kind: PoiKind, px: number, py: number, r = 7) {
  x.fillStyle = "rgba(10,12,14,0.85)"; x.beginPath(); x.arc(px, py, r + 2, 0, Math.PI * 2); x.fill();
  x.fillStyle = COLOR[kind]; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  const g = GLYPH[kind]; if (g) { x.fillStyle = kind === "hospital" ? "#c8102e" : "#111"; x.font = `bold ${Math.round(r * 1.25)}px system-ui`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(g, px, py + 0.5); }
}
function drawRoute(x: CanvasRenderingContext2D, pts: [number, number][], k: number, width: number) {
  x.strokeStyle = "rgba(0,0,0,0.6)"; x.lineWidth = width + 3; x.lineJoin = "round"; x.lineCap = "round"; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a * k, b * k) : x.moveTo(a * k, b * k)); x.stroke();
  x.strokeStyle = "#ffc83d"; x.lineWidth = width; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a * k, b * k) : x.moveTo(a * k, b * k)); x.stroke();
}
function drawWater(x: CanvasRenderingContext2D, k: number) { const g = getGeo(); if (!g) return; x.fillStyle = "#1f5b78"; for (const w of g.water) { x.beginPath(); w.pts.forEach(([a, b], i) => i ? x.lineTo(a * k, b * k) : x.moveTo(a * k, b * k)); x.closePath(); x.fill(); } x.fillStyle = "#2d4a2c"; for (const p of g.parks) { x.beginPath(); p.pts.forEach(([a, b], i) => i ? x.lineTo(a * k, b * k) : x.moveTo(a * k, b * k)); x.closePath(); x.fill(); } }

export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null); const pois = usePois(); const poisRef = useRef(pois); poisRef.current = pois;
  useEffect(() => {
    let raf = 0; const draw = () => {
      const s = useStore.getState(); const c = ref.current; if (!c) return; const x = c.getContext("2d")!; const S = c.width; const R = s.inVehicle ? 170 : 95; const k = S / (R * 2);
      x.clearRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); x.clip(); x.fillStyle = "rgba(14,16,18,0.82)"; x.fillRect(0, 0, S, S);
      x.translate(S / 2, S / 2); x.rotate(-playerYaw.v); x.translate(-playerPos.x * k, -playerPos.z * k);
      drawWater(x, k); x.strokeStyle = "#6b6e74"; x.lineCap = "round"; for (const r of roadsNear(playerPos.x, playerPos.z, R + 60)) { x.lineWidth = Math.max(1.5, r.w * k); x.beginPath(); x.moveTo(r.a[0] * k, r.a[1] * k); x.lineTo(r.b[0] * k, r.b[1] * k); x.stroke(); }
      if (s.route) drawRoute(x, s.route.pts, k, 3.5);
      for (const p of poisRef.current) { if (p.kind === "locked" || p.kind === "done" || p.kind === "landmark") continue; const dx = p.p[0] - playerPos.x, dz = p.p[1] - playerPos.z; const d = Math.hypot(dx, dz); const lim = R * 0.92; const q = d > lim ? [playerPos.x + dx / d * lim, playerPos.z + dz / d * lim] : p.p;
        x.save(); x.translate(q[0] * k, q[1] * k); x.rotate(playerYaw.v); drawPoi(x, p.kind, 0, 0, p.kind === "objective" ? 7 : 5.5); x.restore(); }
      x.restore();
      x.fillStyle = "#fff"; x.strokeStyle = "#c8102e"; x.lineWidth = 2; x.beginPath(); x.moveTo(S / 2, S / 2 - 8); x.lineTo(S / 2 - 6, S / 2 + 6); x.lineTo(S / 2, S / 2 + 2); x.lineTo(S / 2 + 6, S / 2 + 6); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = "#e5c17b"; x.font = "bold 10px system-ui"; x.textAlign = "center"; x.fillText("N", S / 2 + Math.sin(-playerYaw.v + Math.PI) * (S / 2 - 12), S / 2 + Math.cos(-playerYaw.v + Math.PI) * (S / 2 - 12) + 3);
      raf = requestAnimationFrame(draw); }; draw(); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={180} height={180} className="hud-minimap" />;
}

/** Turn-by-turn line under the compass. */
export function Guidance() {
  const route = useStore(s => s.route); const en = useStore(s => s.settings.lang === "english"); const [g, setG] = useState<ReturnType<typeof guidance> | null>(null);
  useEffect(() => { if (!route) { setG(null); return; } const tick = () => setG(guidance(route.pts, playerPos.x, playerPos.z)); tick(); const i = setInterval(tick, 300); return () => clearInterval(i); }, [route]);
  if (!route || !g) return null; const m = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} km` : `${Math.round(v / 10) * 10} m`;
  const turn = g.turn && g.turn.in < 400 ? (en ? `in ${m(g.turn.in)} turn ${g.turn.dir}` : `${m(g.turn.in)} बाद ${g.turn.dir === "left" ? "बाएँ" : "दाएँ"} मुड़ें`) : (en ? "continue straight" : "सीधे चलते रहें");
  return <div className="gps-guide"><span className="gps-arrow">{g.turn && g.turn.in < 60 ? (g.turn.dir === "left" ? "↰" : "↱") : "↑"}</span><div><b>{turn}</b><small>{route.label} · {m(g.remaining)}{route.ok ? "" : en ? " · no road route, heading direct" : " · सड़क नहीं मिली, सीधा रास्ता"}</small></div></div>;
}

export function WorldMap({ close }: { close: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null); const pois = usePois(); const s = useStore(); const en = s.settings.lang === "english"; const t = (e: string, h: string) => en ? e : h;
  const [view, setView] = useState({ cx: playerPos.x, cz: playerPos.z, span: 1800 }); const [sel, setSel] = useState<Poi | { id: "custom"; p: [number, number] } | null>(null); const drag = useRef<{ x: number; y: number; cx: number; cz: number } | null>(null);
  const [filter, setFilter] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const c = ref.current!; const x = c.getContext("2d")!; const W = c.width, H = c.height; const k = W / view.span;
    x.fillStyle = "#1a1c20"; x.fillRect(0, 0, W, H); x.save(); x.translate(W / 2, H / 2); x.translate(-view.cx * k, -view.cz * k);
    drawWater(x, k); const half = view.span * 0.75;
    for (const r of getRoads()) { if (Math.abs(r.a[0] - view.cx) > half || Math.abs(r.a[1] - view.cz) > half) continue; x.strokeStyle = r.cls === "primary" || r.cls === "trunk" ? "#b0aca2" : r.cls === "secondary" || r.cls === "tertiary" ? "#8a8780" : "#55565c"; x.lineWidth = Math.max(1, r.w * k); x.beginPath(); x.moveTo(r.a[0] * k, r.a[1] * k); x.lineTo(r.b[0] * k, r.b[1] * k); x.stroke(); }
    if (s.route) drawRoute(x, s.route.pts, k, 4);
    x.font = "11px system-ui"; x.textAlign = "center";
    for (const p of pois) { if (filter[p.kind] === false) continue; drawPoi(x, p.kind, p.p[0] * k, p.p[1] * k, sel && "kind" in sel && sel.id === p.id ? 10 : 7.5); if (view.span < 1400 && p.kind !== "locked") { x.fillStyle = "#f2ead8"; x.fillText(en ? p.en : p.hi, p.p[0] * k, p.p[1] * k - 13); } }
    if (s.waypoint) drawPoi(x, "objective", s.waypoint.p[0] * k, s.waypoint.p[1] * k, 8);
    if (sel && !("kind" in sel)) drawPoi(x, "objective", sel.p[0] * k, sel.p[1] * k, 8);
    x.translate(playerPos.x * k, playerPos.z * k); x.rotate(-playerYaw.v + Math.PI); x.fillStyle = "#fff"; x.strokeStyle = "#c8102e"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -10); x.lineTo(-7, 8); x.lineTo(0, 3); x.lineTo(7, 8); x.closePath(); x.fill(); x.stroke();
    x.restore();
  }, [view, pois, sel, s.route, s.waypoint, filter, en]);
  const toWorld = (e: React.MouseEvent) => { const c = ref.current!; const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * c.width, py = (e.clientY - r.top) / r.height * c.height; const k = c.width / view.span; return [view.cx + (px - c.width / 2) / k, view.cz + (py - c.height / 2) / k] as [number, number]; };
  const pick = (e: React.MouseEvent) => { const w = toWorld(e); const k = ref.current!.width / view.span; let best: Poi | null = null, bd = 14 / k; for (const p of pois) { if (filter[p.kind] === false) continue; const d = Math.hypot(p.p[0] - w[0], p.p[1] - w[1]); if (d < bd) { bd = d; best = p; } } setSel(best ?? { id: "custom", p: w }); };
  const setRoute = () => { if (!sel) return; const label = "kind" in sel ? (en ? sel.en : sel.hi) : t("Map marker", "नक्शे का निशान"); s.set({ waypoint: { p: sel.p, label }, route: undefined }); close(); };
  const zoom = (f: number) => setView(v => ({ ...v, span: Math.max(300, Math.min(5200, v.span * f)) }));
  const kinds: PoiKind[] = ["main", "side", "weapons", "clothing", "garage", "hospital", "dealership", "ghat", "vehicle", "done", "locked"];
  return <div className="worldmap">
    <div className="wm-canvas"><canvas ref={ref} width={900} height={640} className="bigmap" onWheel={e => zoom(e.deltaY > 0 ? 1.15 : 0.87)}
      onMouseDown={e => { drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cz: view.cz }; }}
      onMouseMove={e => { if (!drag.current) return; const c = ref.current!; const r = c.getBoundingClientRect(); const k = (c.width / view.span) * (r.width / c.width); setView(v => ({ ...v, cx: drag.current!.cx - (e.clientX - drag.current!.x) / k, cz: drag.current!.cz - (e.clientY - drag.current!.y) / k })); }}
      onMouseUp={e => { const moved = drag.current && Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 4; drag.current = null; if (!moved) pick(e); }} />
      <div className="wm-zoom"><button className="btn-sm" onClick={() => zoom(0.75)}>＋</button><button className="btn-sm" onClick={() => zoom(1.33)}>－</button><button className="btn-sm" onClick={() => setView(v => ({ ...v, cx: playerPos.x, cz: playerPos.z }))}>◎</button></div></div>
    <aside className="wm-side">
      <h2>{t("Kanpur map", "कानपुर का नक्शा")}</h2>
      {sel ? <div className="wm-sel">{"kind" in sel ? <><small style={{ color: COLOR[sel.kind] }}>{labelKind(sel.kind, en)}</small><h3>{en ? sel.en : sel.hi}</h3>{(sel.desc || sel.descHi) && <p>{en ? sel.desc : sel.descHi}</p>}{sel.mission && <p className="muted small">{t("Reward", "इनाम")} ₹{sel.mission.reward.coins} · {sel.mission.reward.xp} XP{sel.mission.timeLimitSec ? ` · ⏱ ${Math.round(sel.mission.timeLimitSec / 60)} min` : ""}</p>}</> : <h3>{t("Custom marker", "अपना निशान")}</h3>}
        <p className="muted small">{Math.round(Math.hypot(sel.p[0] - playerPos.x, sel.p[1] - playerPos.z))} m {t("away (straight line)", "दूर (सीधी दूरी)")}</p>
        <div className="row"><button className="btn btn-accent" onClick={setRoute}>{t("Set GPS route", "रास्ता लगाओ")}</button>{s.waypoint && <button className="btn" onClick={() => { s.set({ waypoint: undefined, route: s.mission ? s.route : undefined }); setSel(null); }}>{t("Clear route", "रास्ता हटाओ")}</button>}</div>
        {s.mission && <p className="muted small">{t("An active mission's objective takes priority for GPS.", "चल रहे मिशन का लक्ष्य GPS में पहले आता है।")}</p>}
      </div> : <p className="muted">{t("Click a marker or anywhere on the map. Drag to pan, wheel to zoom.", "किसी निशान या नक्शे पर कहीं भी क्लिक करो। खींचो तो सरकेगा, व्हील से ज़ूम।")}</p>}
      <div className="wm-legend">{kinds.map(k => <label key={k}><input type="checkbox" checked={filter[k] !== false} onChange={e => setFilter(f => ({ ...f, [k]: e.target.checked }))} /><span className="dot" style={{ background: COLOR[k] }}>{GLYPH[k]}</span>{labelKind(k, en)}</label>)}</div>
      <p className="muted small">{t("Map data © OpenStreetMap contributors (ODbL).", "नक्शा डेटा © OpenStreetMap योगदानकर्ता (ODbL)।")}</p>
      <button className="btn" onClick={close}>{t("Back to game (M)", "गेम पर लौटो (M)")}</button>
    </aside>
  </div>;
}
function labelKind(k: PoiKind, en: boolean) { const L: Record<PoiKind, [string, string]> = { main: ["Story chapter", "कहानी का अध्याय"], side: ["Side mission", "साइड मिशन"], locked: ["Locked", "बंद"], done: ["Completed", "पूरा"], weapons: ["Weapon store", "हथियार की दुकान"], clothing: ["Clothing store", "कपड़ों की दुकान"], garage: ["Garage", "गैराज"], hospital: ["Hospital", "अस्पताल"], dealership: ["Vehicle showroom", "गाड़ी शोरूम"], landmark: ["Landmark", "मशहूर जगह"], ghat: ["Ganga ghat", "गंगा घाट"], vehicle: ["Your vehicle", "आपकी गाड़ी"], safe: ["Safe house", "सेफ़ हाउस"], objective: ["Objective", "लक्ष्य"] }; return en ? L[k][0] : L[k][1]; }
