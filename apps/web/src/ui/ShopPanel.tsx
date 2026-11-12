"use client";
/** Shop interface opened at a shopkeeper's counter: browse, inspect, preview (clothes), buy, equip, repair, treat. */
import { useEffect, useMemo, useState } from "react";
import { ITEMS, SHOPS, VEHICLE_PRICES, VEHICLE_INFO, VEHICLE_SPECS, purchase, equipOutfit, buyVehicle, repairVehicle, repairCost, hospitalTreat, HOSPITAL_FEE, item, type Item, type VehicleKind } from "@kanpurverse/shared";
import { useStore, applyTx, wallet } from "../state/store";
import { net } from "../net/client";
import { sfx } from "../audio/sfx";

export function ShopPanel() {
  const shopId = useStore(s => s.shop); const site = SHOPS.find(s => s.id === shopId);
  const lang = useStore(s => s.settings.lang); const en = lang === "english"; const t = (e: string, h: string) => en ? e : h;
  const coins = useStore(s => s.profile?.coins ?? 0); const game = useStore(s => s.game); const health = useStore(s => s.health);
  const vehicles = useStore(s => s.vehicles); const lastVehicle = useStore(s => s.lastVehicle);
  const [sel, setSel] = useState<string | null>(null);
  const greet = useMemo(() => site ? site.greet[Math.floor(Math.random() * site.greet.length)] : "", [site]);
  const close = () => { sfx.back(); useStore.getState().set({ shop: undefined, previewOutfit: undefined }); };
  useEffect(() => { if (!site) return; const k = (e: KeyboardEvent) => { if (e.code === "Escape") { e.stopPropagation(); close(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, [site]);
  if (!site) return null;
  const list: Item[] = site.type === "hospital" ? ITEMS.filter(i => i.shop === "medical") : ITEMS.filter(i => i.shop === site.type);
  const owned = (i: Item) => (i.kind === "weapon" && game.weapons.includes(i.id)) || (i.kind === "clothing" && game.wardrobe.includes(i.id));
  const worn = (i: Item) => i.clothing && (game.outfit[i.clothing.slot] === i.id);
  const buy = (id: string) => { if (applyTx(purchase(wallet(), id))) { sfx.coin(); net.save(); } else sfx.error(); };
  const selected = sel ? item(sel) : undefined;
  return <div className="shop-panel" role="dialog" aria-label={site.nameHi}>
    <header><div><small>{site.keeper.nameHi}</small><h2>{t(site.name, site.nameHi)}</h2><p className="shop-greet">“{greet}”</p></div><div className="shop-money">₹{coins.toLocaleString("en-IN")}<button className="btn-ghost" onClick={close} aria-label="Close">✕</button></div></header>
    {site.type === "garage" ? <GarageBody /> : site.type === "dealership" ? <DealerBody /> : <>
      {site.type === "hospital" && <div className="shop-service"><b>{t("Full treatment", "पूरा इलाज")}</b><span>{t(`Health ${health}/100`, `सेहत ${health}/100`)} · ₹{HOSPITAL_FEE}</span><button className="btn btn-accent" disabled={health >= 100} onClick={() => { if (applyTx(hospitalTreat(wallet(), health))) { sfx.coin(); net.save(); } }}>{t("Treat me", "इलाज करो")}</button></div>}
      <div className="shop-body">
        <ul className="shop-list">{list.map(i => <li key={i.id} className={`${sel === i.id ? "on" : ""} ${owned(i) ? "owned" : ""}`}><button onClick={() => { setSel(i.id); sfx.ui(); if (i.clothing) useStore.getState().set({ previewOutfit: { ...game.outfit, ...(i.clothing.slot === "acc" ? { acc: i.id } : { [i.clothing.slot]: i.id }) } }); }}>
          <span>{t(i.name, i.nameHi)}</span><small>{owned(i) ? (worn(i) ? t("wearing", "पहना है") : t("owned", "आपका")) : i.price ? `₹${i.price}` : t("free", "मुफ़्त")}{i.kind === "ammo" || i.kind === "medical" || i.kind === "food" ? ` · ${t("carry", "पास")} ${game.items[i.id] ?? 0}` : ""}</small></button></li>)}</ul>
        <div className="shop-detail">{selected ? <>
          <h3>{t(selected.name, selected.nameHi)}</h3><p>{t(selected.desc, selected.descHi)}</p>
          {selected.weapon && <p className="muted small">{t("Damage", "ताक़त")} {selected.weapon.damage} · {t("Range", "पहुँच")} {selected.weapon.range} m{selected.weapon.clip ? ` · ${t("Clip", "मैगज़ीन")} ${selected.weapon.clip}` : ""}{selected.weapon.stun ? ` · ${t("Stun", "सुन्न")} ${selected.weapon.stun}s` : ""}</p>}
          <div className="row">
            {!owned(selected) && <button className="btn btn-accent" onClick={() => buy(selected.id)}>{t(`Buy ₹${selected.price}`, `खरीदो ₹${selected.price}`)}</button>}
            {selected.clothing && owned(selected) && <button className="btn btn-accent" onClick={() => { if (applyTx(equipOutfit(wallet(), selected.id))) { useStore.getState().set({ previewOutfit: undefined }); net.save(); } }}>{worn(selected) && selected.clothing.slot === "acc" ? t("Take off", "उतारो") : t("Wear", "पहनो")}</button>}
            {selected.kind === "weapon" && owned(selected) && <button className="btn" onClick={() => { const s = useStore.getState(); s.set({ game: { ...s.game, equipped: selected.id } }); sfx.ui(); }}>{t("Hold", "हाथ में लो")}</button>}
          </div>
          {selected.clothing && <p className="muted small">{t("Preview is on Kanupriya now; leaving undoes it unless you wear it.", "कनुप्रिया पे अभी झलक दिख रही है; पहनोगी नहीं तो बाहर निकलते ही हट जाएगा।")}</p>}
        </> : <p className="muted">{t("Pick an item to see details.", "कोई चीज़ चुनो, पूरी जानकारी दिखेगी।")}</p>}</div>
      </div></>}
    <footer className="muted small">{t("Esc to leave", "Esc से बाहर")} · {t(`Bought vehicles appear outside the showroom; repaired vehicles keep their place.`, `खरीदी गाड़ियाँ शोरूम के बाहर मिलेंगी।`)}</footer>
  </div>;

  function GarageBody() {
    const id = lastVehicle && vehicles[lastVehicle] ? lastVehicle : undefined; const c = id ? (game.vehicleHealth[id] ?? { engine: 100, body: 100 }) : undefined;
    return <div className="shop-service col">{id && c ? <>
      <b>{t(VEHICLE_INFO[vehicles[id].kind].name, VEHICLE_INFO[vehicles[id].kind].nameHi)}</b>
      <span>{t("Engine", "इंजन")} {Math.round(c.engine)}% · {t("Body", "बॉडी")} {Math.round(c.body)}%</span>
      <button className="btn btn-accent" disabled={repairCost(c) <= 0} onClick={() => { if (applyTx(repairVehicle(wallet(), id))) { sfx.coin(); net.save(); } }}>{repairCost(c) > 0 ? t(`Repair ₹${repairCost(c)}`, `मरम्मत ₹${repairCost(c)}`) : t("Nothing to fix", "सब ठीक है")}</button>
    </> : <span>{t("Drive a vehicle here first; Pappu fixes the last one you drove.", "पहिले कोई गाड़ी चलाकर लाओ; पप्पू आखिरी चलाई गाड़ी ठीक करेगा।")}</span>}</div>;
  }
  function DealerBody() {
    const kinds = Object.keys(VEHICLE_PRICES) as VehicleKind[];
    return <ul className="shop-list wide">{kinds.map(k => { const ownedV = game.boughtVehicles.includes(k); const sp = VEHICLE_SPECS[k]; return <li key={k} className={ownedV ? "owned" : ""}><div className="dealer-row">
      <span><b>{t(VEHICLE_INFO[k].name, VEHICLE_INFO[k].nameHi)}</b> <small className="muted">{t(VEHICLE_INFO[k].cls, VEHICLE_INFO[k].clsHi)} · {Math.round(sp.max * 3.6)} km/h · {sp.grip}g</small></span>
      {ownedV ? <small>{t("owned", "आपकी")}</small> : <button className="btn-sm accent" onClick={() => { if (applyTx(buyVehicle(wallet(), k))) { sfx.coin(); net.spawnOwned(k); net.save(); } }}>₹{VEHICLE_PRICES[k]!.toLocaleString("en-IN")}</button>}
    </div></li>; })}</ul>;
  }
}
