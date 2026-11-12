"use client";
/** Player status HUD: health and stamina bars, held weapon and ammo, vehicle-entry notice, knock-out screen, inventory. */
import { useEffect, useState } from "react";
import { item, consumeItem, type Item } from "@kanpurverse/shared";
import { useStore, applyTx, wallet } from "../state/store";
import { runtime } from "../game/playerStatus";
import { cycleWeapon } from "../game/combatRuntime";
import { net } from "../net/client";

export function StatusBars() {
  const health = useStore(s => s.health); const equipped = useStore(s => s.game.equipped); const clip = useStore(s => s.game.clip); const items = useStore(s => s.game.items);
  const en = useStore(s => s.settings.lang === "english"); const [st, setSt] = useState(100); const [ex, setEx] = useState(false); const [hurt, setHurt] = useState(0);
  useEffect(() => { const i = setInterval(() => { setSt(Math.round(runtime.stamina)); setEx(runtime.exhausted); const s = useStore.getState(); if (Math.abs(s.game.stamina - runtime.stamina) > 2) s.set({ game: { ...s.game, stamina: Math.round(runtime.stamina) } }); }, 250); return () => clearInterval(i); }, []);
  useEffect(() => { const h = () => setHurt(Date.now()); window.addEventListener("kv:hurt", h); return () => window.removeEventListener("kv:hurt", h); }, []);
  const w = equipped ? item(equipped) : undefined; const ammo = w?.weapon?.ammo;
  return <>
    <div className="status-bars" aria-label="Status">
      <div className="bar health"><i style={{ width: health + "%" }} /><span>♥ {health}</span></div>
      <div className={`bar stamina ${ex ? "ex" : ""}`}><i style={{ width: st + "%" }} /><span>{en ? "Stamina" : "स्टैमिना"} {st}</span></div>
      <div className="weapon-chip" title="T">{w ? <>{en ? w.name : w.nameHi}{w.weapon?.clip ? <b> {clip[equipped!] ?? 0}/{ammo ? items[ammo] ?? 0 : 0}</b> : null}</> : (en ? "Unarmed" : "खाली हाथ")} <small>T</small></div>
    </div>
    {Date.now() - hurt < 450 && <div className="hurt-flash" />}
  </>;
}
export function VehicleNotice() {
  const n = useStore(s => s.notice); const [, tick] = useState(0); useEffect(() => { if (!n) return; const i = setTimeout(() => tick(x => x + 1), 3300); return () => clearTimeout(i); }, [n]);
  if (!n || Date.now() - n.at > 3200) return null;
  return <div className="vehicle-notice" key={n.at}><b>{n.text}</b>{n.sub && <small>{n.sub}</small>}</div>;
}
export function KnockOut() {
  const d = useStore(s => s.dead); const en = useStore(s => s.settings.lang === "english"); if (!d) return null;
  return <div className="knockout"><h1>{en ? "KNOCKED OUT" : "बेहोश"}</h1><p>{en ? `Waking up at City Hospital… bill ₹${d.bill}` : `सिटी हॉस्पिटल में होश आ रहा है… बिल ₹${d.bill}`}</p></div>;
}
export function InventoryPanel({ close }: { close: () => void }) {
  const s = useStore(); const t = (en: string, hi: string) => s.settings.lang === "english" ? en : hi; const g = s.game;
  const use = (id: string) => { const r = consumeItem(wallet(), id, s.health); if (applyTx(r)) { runtime.stamina = Math.max(runtime.stamina, useStore.getState().game.stamina); net.save(); } };
  const name = (it?: Item) => it ? t(it.name, it.nameHi) : "";
  return <><h2>{t("Inventory", "इन्वेंटरी")} · ₹{(s.profile?.coins ?? 0).toLocaleString("en-IN")}</h2>
    <h3 className="inv-h">{t("Weapons", "हथियार")} <small className="muted">T {t("to cycle", "से बदलो")}</small></h3>
    {g.weapons.length ? g.weapons.map(id => <div key={id} className="shop-item"><b>{name(item(id))}</b><span>{g.equipped === id ? t("in hand", "हाथ में") : ""}</span><button className="btn-sm" onClick={() => { s.set({ game: { ...g, equipped: g.equipped === id ? undefined : id } }); }}>{g.equipped === id ? t("Holster", "रख दो") : t("Hold", "पकड़ो")}</button></div>) : <p className="muted">{t("None yet: earn them in the story or buy at Shera Sports.", "अभी कुछ नहीं: कहानी में मिलेंगे या शेरा स्पोर्ट्स से खरीदो।")}</p>}
    <h3 className="inv-h">{t("Supplies", "सामान")}</h3>
    {Object.entries(g.items).filter(([, n]) => n > 0).map(([id, n]) => { const it = item(id); return <div key={id} className="shop-item"><b>{name(it)} ×{n}</b><span className="muted">{it ? t(it.desc, it.descHi) : ""}</span>{(it?.kind === "medical" || it?.kind === "food") && <button className="btn-sm accent" onClick={() => use(id)}>{t("Use", "इस्तेमाल")}</button>}</div>; })}
    {!Object.keys(g.items).length && <p className="muted">{t("Empty.", "खाली।")}</p>}
    <h3 className="inv-h">{t("Wardrobe", "अलमारी")} <small className="muted">{t("change clothes at Rangrez Fashion", "कपड़े रंगरेज़ फ़ैशन में बदलो")}</small></h3>
    <p>{g.wardrobe.map(id => name(item(id))).join(" · ")}</p>
    <p className="muted small">{t("Stats", "आँकड़े")}: {t("knock-outs", "बेहोश किए")} {g.stats.knockouts} · {t("hospital visits", "अस्पताल")} {g.stats.deaths} · {t("best drift", "बेस्ट ड्रिफ्ट")} {Math.round(g.stats.driftBest)}</p>
    <div className="row"><button className="btn" onClick={() => cycleWeapon()}>{t("Cycle weapon (T)", "हथियार बदलो (T)")}</button><button className="btn" onClick={close}>{t("Close", "बंद")}</button></div></>;
}
