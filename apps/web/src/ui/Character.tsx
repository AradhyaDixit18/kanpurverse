"use client";
/** Character creator with a live 3D preview. */
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { isValidName, type Appearance, type AnimState } from "@kanpurverse/shared";
import { Avatar, SKIN, HAIR_COLORS, TOPS, BOTTOMS, SHOES } from "../game/Avatar";
import { useStore } from "../state/store";
import { sfx } from "../audio/sfx";

export function CharacterCreator({ onDone }: { onDone: () => void }) {
  const s = useStore(); const [a, setA] = useState<Appearance>(s.appearance); const [name, setName] = useState(s.name); const [err, setErr] = useState(""); const [anim, setAnim] = useState<AnimState>("idle");
  const lang = s.settings.lang; const t = (en: string, hi: string) => lang === "english" ? en : hi;
  const Opt = ({ label, k, n, colors }: { label: string; k: keyof Appearance; n: number; colors?: number[] }) => <div className="opt"><span>{label}</span><div className="swatches">{Array.from({ length: n }, (_, i) => <button key={i} type="button" className={`sw ${a[k] === i ? "on" : ""}`} style={colors ? { background: "#" + colors[i].toString(16).padStart(6, "0") } : undefined} onClick={() => { setA({ ...a, [k]: i }); sfx.ui(); }}>{colors ? "" : i + 1}</button>)}</div></div>;
  const save = () => { const v = isValidName(name.trim()); if (!v.ok) { setErr(v.reason!); sfx.error(); return; } s.set({ appearance: a, name: name.trim() }); s.saveLocal(); sfx.ui(); onDone(); };
  const random = () => { const r = (n: number) => Math.floor(Math.random() * n); setA({ body: Math.random() < 0.5 ? "m" : "f", skin: r(6), hair: r(6), hairColor: r(5), top: r(5), bottom: r(6), shoes: r(4), accessory: r(4) }); sfx.ui(); };
  return <div className="screen creator">
    <div className="creator-preview"><Canvas camera={{ position: [0, 1.4, 3.4], fov: 38 }} shadows><color attach="background" args={["#15131a"]} /><ambientLight intensity={0.55} /><hemisphereLight args={["#ffd9c0", "#2a2030", 0.6]} /><spotLight position={[2.5, 5, 3]} angle={0.5} penumbra={0.6} intensity={40} castShadow color="#fff2e0" /><spotLight position={[-3, 3, -2]} angle={0.6} penumbra={0.8} intensity={14} color="#ff5a3c" /><pointLight position={[0, 1, -2.5]} intensity={6} color="#3d8bff" />
            <group position={[0, -0.9, 0]}><Avatar appearance={a} anim={anim} /></group>
            <mesh position={[0, -0.97, 0]} receiveShadow><cylinderGeometry args={[1.25, 1.35, 0.14, 48]} /><meshStandardMaterial color="#2a2b33" metalness={0.4} roughness={0.5} /></mesh>
            <mesh position={[0, -0.895, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.25, 48]} /><meshBasicMaterial color="#ff5a3c" /></mesh>
            <OrbitControls enablePan={false} target={[0, 0.15, 0]} minDistance={2} maxDistance={5} autoRotate autoRotateSpeed={0.6} /></Canvas>
      <div className="anim-row">{(["idle", "walk", "wave", "dance", "celebrate"] as AnimState[]).map(x => <button key={x} className={`btn-sm ${anim === x ? "accent" : ""}`} onClick={() => setAnim(x)}>{x}</button>)}</div></div>
    <div className="creator-form">
      <h1>{t("Create your character", "अपना किरदार बनाओ")}</h1>
      <label className="field"><span>{t("Name (3–16, letters/numbers/_)", "नाम (3–16 अक्षर/अंक/_)")}</span><input value={name} onChange={e => { setName(e.target.value); setErr(""); }} maxLength={16} placeholder="e.g. Rad_Kanpur" /></label>{err && <div className="err">{err}</div>}
      <div className="opt"><span>{t("Body", "शरीर")}</span><div className="swatches"><button className={`sw wide ${a.body === "m" ? "on" : ""}`} onClick={() => setA({ ...a, body: "m" })}>{t("A", "अ")}</button><button className={`sw wide ${a.body === "f" ? "on" : ""}`} onClick={() => setA({ ...a, body: "f" })}>{t("B", "ब")}</button></div></div>
      <Opt label={t("Skin", "त्वचा")} k="skin" n={6} colors={SKIN} /><Opt label={t("Hair style", "बाल")} k="hair" n={6} /><Opt label={t("Hair colour", "बालों का रंग")} k="hairColor" n={5} colors={HAIR_COLORS} />
      <Opt label={t("Top", "ऊपर")} k="top" n={5} colors={TOPS.slice(0, 5)} /><Opt label={t("Bottom", "नीचे")} k="bottom" n={6} colors={BOTTOMS} /><Opt label={t("Shoes", "जूते")} k="shoes" n={4} colors={SHOES} />
      <div className="opt"><span>{t("Accessory", "एक्सेसरी")}</span><div className="swatches">{[t("None", "कुछ नहीं"), t("Shades", "चश्मा"), t("Cap", "टोपी"), t("Gamcha", "गमछा")].map((l, i) => <button key={i} className={`sw wide ${a.accessory === i ? "on" : ""}`} onClick={() => setA({ ...a, accessory: i })}>{l}</button>)}</div></div>
      <p className="muted">{t("Kanpuriya kurta, cricket jersey and leather jacket unlock at Naveen Market with coins from missions.", "कानपुरिया कुर्ता, क्रिकेट जर्सी और लेदर जैकेट नवीन मार्केट में मिशन के सिक्कों से मिलेंगे।")}</p>
      <div className="row"><button className="btn" onClick={random}>{t("Randomise", "रैंडम")}</button><button className="btn btn-accent" onClick={save}>{t("Save & continue", "सेव करो")}</button></div>
    </div>
  </div>;
}
