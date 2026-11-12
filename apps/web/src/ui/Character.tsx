"use client";
/**
 * Kanupriya's look: name, skin and hair, plus her outfit chosen from the clothes she owns. The outfit is the same
 * `game.outfit` the game, the shops and the save use (final QA found this screen had its own disconnected top/bottom/
 * shoes swatches that the in-game model ignored).
 */
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { isValidName, sanitizeOutfit, wardrobeFor, type Appearance, type AnimState, type Outfit } from "@kanpurverse/shared";
import { Avatar, SKIN, HAIR_COLORS } from "../game/Avatar";
import { readSoloSave, writeSoloSave } from "../state/soloSave";
import { useStore, PROTAGONIST_LOOK } from "../state/store";
import { sfx } from "../audio/sfx";

export function CharacterCreator({ onDone }: { onDone: () => void }) {
  const s = useStore(); const [a, setA] = useState<Appearance>(s.appearance); const [name, setName] = useState(s.name); const [err, setErr] = useState(""); const [anim, setAnim] = useState<AnimState>("idle");
  const [saved] = useState(() => readSoloSave()); const game = saved?.game ?? s.game; const [outfit, setOutfit] = useState<Outfit>(() => sanitizeOutfit(game, game.outfit));
  const lang = s.settings.lang; const t = (en: string, hi: string) => lang === "english" ? en : hi;
  const Opt = ({ label, k, n, colors }: { label: string; k: keyof Appearance; n: number; colors?: number[] }) => <div className="opt"><span>{label}</span><div className="swatches">{Array.from({ length: n }, (_, i) => <button key={i} type="button" className={`sw ${a[k] === i ? "on" : ""}`} style={colors ? { background: "#" + colors[i].toString(16).padStart(6, "0") } : undefined} onClick={() => { setA({ ...a, [k]: i }); sfx.ui(); }}>{colors ? "" : i + 1}</button>)}</div></div>;
  const save = () => { const v = isValidName(name.trim()); if (!v.ok) { setErr(v.reason!); sfx.error(); return; } const o = sanitizeOutfit(game, outfit); s.set({ appearance: a, name: name.trim(), game: { ...s.game, outfit: o } }); s.saveLocal(); if (saved) writeSoloSave({ ...saved, game: { ...saved.game, outfit: o } }); sfx.ui(); onDone(); };
  const random = () => { const r = (n: number) => Math.floor(Math.random() * n); setA({ ...a, skin: r(6), hair: r(6), hairColor: r(5) }); sfx.ui(); };
  return <div className="screen creator">
    <div className="creator-preview"><Canvas camera={{ position: [0, 1.4, 3.4], fov: 38 }} shadows><color attach="background" args={["#15131a"]} /><ambientLight intensity={0.55} /><hemisphereLight args={["#ffd9c0", "#2a2030", 0.6]} /><spotLight position={[2.5, 5, 3]} angle={0.5} penumbra={0.6} intensity={40} castShadow color="#fff2e0" /><spotLight position={[-3, 3, -2]} angle={0.6} penumbra={0.8} intensity={14} color="#ff5a3c" /><pointLight position={[0, 1, -2.5]} intensity={6} color="#3d8bff" />
            <group position={[0, -0.9, 0]}><Avatar appearance={a} anim={anim} protagonist outfit={outfit} /></group>
            <mesh position={[0, -0.97, 0]} receiveShadow><cylinderGeometry args={[1.25, 1.35, 0.14, 48]} /><meshStandardMaterial color="#2a2b33" metalness={0.4} roughness={0.5} /></mesh>
            <mesh position={[0, -0.895, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.25, 48]} /><meshBasicMaterial color="#ff5a3c" /></mesh>
            <OrbitControls enablePan={false} target={[0, 0.15, 0]} minDistance={2} maxDistance={5} autoRotate autoRotateSpeed={0.6} /></Canvas>
      <div className="anim-row">{(["idle", "walk", "wave", "dance", "celebrate"] as AnimState[]).map(x => <button key={x} className={`btn-sm ${anim === x ? "accent" : ""}`} onClick={() => setAnim(x)}>{x}</button>)}</div></div>
    <div className="creator-form">
      <h1>{t("Kanupriya Tommy", "कनुप्रिया टॉमी")}</h1><p className="muted bio">{t("24. Grew up near Parmat Ghat, left for Delhi to work as a video journalist and courier rider, and is back in Kanpur after four years. Everyone calls her Tommy because she never lets go of a story. Style her look below.", "24 साल। परमट घाट के पास पली-बढ़ी, दिल्ली में वीडियो पत्रकार और कूरियर राइडर बनी, और चार साल बाद कानपुर लौटी है। सब उसे टॉमी कहते हैं क्योंकि वो कहानी का पीछा कभी नहीं छोड़ती। नीचे उसका रूप सजाओ।")}</p>
      <label className="field"><span>{t("Save-slot name (3–16, letters/numbers/_)", "सेव का नाम (3–16 अक्षर/अंक/_)")}</span><input value={name} onChange={e => { setName(e.target.value); setErr(""); }} maxLength={16} placeholder="Kanupriya" /></label>{err && <div className="err">{err}</div>}
      <div className="opt"><span>{t("Body", "शरीर")}</span><div className="swatches"><button className={`sw wide ${a.body === "m" ? "on" : ""}`} onClick={() => setA({ ...a, body: "m" })}>{t("A", "अ")}</button><button className={`sw wide ${a.body === "f" ? "on" : ""}`} onClick={() => setA({ ...a, body: "f" })}>{t("B", "ब")}</button></div></div>
      <Opt label={t("Skin", "त्वचा")} k="skin" n={6} colors={SKIN} /><Opt label={t("Hair style", "बाल")} k="hair" n={6} /><Opt label={t("Hair colour", "बालों का रंग")} k="hairColor" n={5} colors={HAIR_COLORS} />
      {(["top", "bottom", "shoes", "acc"] as const).map(slot => <div key={slot} className="opt"><span>{({ top: t("Top", "ऊपर"), bottom: t("Bottom", "नीचे"), shoes: t("Shoes", "जूते"), acc: t("Accessory", "एक्सेसरी") })[slot]}</span><div className="swatches">
        {slot === "acc" && <button type="button" className={`sw wide ${!outfit.acc ? "on" : ""}`} onClick={() => setOutfit({ ...outfit, acc: undefined })}>{t("None", "कुछ नहीं")}</button>}
        {wardrobeFor(game, slot).map(it => <button key={it.id} type="button" className={`sw wide ${outfit[slot] === it.id ? "on" : ""}`} style={{ borderBottom: `3px solid #${it.clothing!.color.toString(16).padStart(6, "0")}` }} onClick={() => { setOutfit({ ...outfit, [slot]: it.id }); sfx.ui(); }}>{t(it.name, it.nameHi)}</button>)}</div></div>)}
      <p className="muted">{t("Only clothes in her wardrobe are shown. Buy more at Rangrez Fashion House in the city.", "यहाँ सिर्फ़ अलमारी के कपड़े दिखते हैं। नए कपड़े शहर में रंगरेज़ फ़ैशन हाउस से खरीदो।")}</p>
      <div className="row"><button className="btn" onClick={() => { setA(PROTAGONIST_LOOK); setOutfit(sanitizeOutfit(game, {})); }}>{t("Signature look", "असली रूप")}</button><button className="btn" onClick={random}>{t("Randomise", "रैंडम")}</button><button className="btn btn-accent" onClick={save}>{t("Save & continue", "सेव करो")}</button></div>
    </div>
  </div>;
}
