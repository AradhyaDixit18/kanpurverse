"use client";
import { useStore, useGraphics } from "../state/store";
import type { GraphicsOverrides } from "../game/graphics";
import { speak } from "../audio/voice";
import { linesFor } from "../game/dialogueData";

export function SettingsPanel() {
  const st = useStore(s => s.settings); const set = useStore(s => s.setSettings); const g = useGraphics(); const gfx = (p: GraphicsOverrides) => set({ gfx: { ...(st.gfx ?? {}), ...p } }); const lang = st.lang; const t = (en: string, hi: string) => lang === "english" ? en : hi;
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="srow"><span>{label}</span>{children}</label>;
  return <div className="settings">
    <Row label={t("Dialogue language", "संवाद भाषा")}><select value={st.lang} onChange={e => set({ lang: e.target.value as never })}><option value="kanpuriya">Kanpuriya Hindi (कनपुरिया)</option><option value="hindi">Standard Hindi (हिंदी)</option><option value="english">English</option></select></Row>
    <Row label={t("English line under Hindi dialogue", "हिंदी संवाद के नीचे अंग्रेज़ी")}><input type="checkbox" checked={!!st.englishSubs} onChange={e => set({ englishSubs: e.target.checked })} /></Row>
    <Row label={t("Clean Language Mode", "साफ़ भाषा मोड")}><input type="checkbox" checked={st.cleanLanguage} onChange={e => set({ cleanLanguage: e.target.checked })} /></Row>
    <Row label={t("Subtitles", "सबटाइटल")}><input type="checkbox" checked={st.subtitles} onChange={e => set({ subtitles: e.target.checked })} /></Row>
    <Row label={t("NPC voice", "एनपीसी आवाज़")}><input type="checkbox" checked={st.voice} onChange={e => set({ voice: e.target.checked })} /></Row>
    <Row label={t("Test voice", "आवाज़ सुनो")}><button className="btn-sm" type="button" onClick={() => { const l = linesFor(st.lang).find(x => x.id === "guide_babloo.greet_1"); if (l) speak(l, "guide_babloo"); }}>▶</button></Row>
    <Row label={t("Master volume", "मुख्य आवाज़")}><input type="range" min={0} max={1} step={0.05} value={st.master} onChange={e => set({ master: +e.target.value })} /></Row>
    <Row label={t("Music", "संगीत")}><input type="range" min={0} max={1} step={0.05} value={st.music} onChange={e => set({ music: +e.target.value })} /></Row>
    <Row label={t("Dialogue volume", "संवाद की आवाज़")}><input type="range" min={0} max={1} step={0.05} value={st.dialogue} onChange={e => set({ dialogue: +e.target.value })} /></Row>
    <Row label={t("Environment sounds", "माहौल की आवाज़ें")}><input type="range" min={0} max={1} step={0.05} value={st.ambience} onChange={e => set({ ambience: +e.target.value })} /></Row>
    <Row label={t("Sound effects", "ध्वनि प्रभाव")}><input type="range" min={0} max={1} step={0.05} value={st.sfx} onChange={e => set({ sfx: +e.target.value })} /></Row>
    <Row label={t("Graphics preset", "ग्राफ़िक्स प्रीसेट")}><select value={st.quality} onChange={e => set({ quality: e.target.value as never, gfx: undefined })}><option value="low">{t("Low (phones)", "कम (फ़ोन)")}</option><option value="medium">{t("Medium", "मध्यम")}</option><option value="high">{t("High", "उच्च")}</option><option value="ultra">{t("Ultra", "अल्ट्रा")}</option></select></Row>
    <details className="gfx-adv"><summary>{t("Advanced graphics", "एडवांस्ड ग्राफ़िक्स")}{st.gfx && Object.keys(st.gfx).length ? t(" · custom", " · कस्टम") : ""}</summary>
      <Row label={t("Shadow quality", "छाया")}><select value={g.shadows} onChange={e => gfx({ shadows: e.target.value as never })}>{["off", "low", "medium", "high", "ultra"].map(v => <option key={v} value={v}>{v}</option>)}</select></Row>
      <Row label={t("Anti-aliasing", "एंटी-एलियासिंग")}><select value={g.aa} onChange={e => gfx({ aa: e.target.value as never })}><option value="off">off</option><option value="smaa">SMAA</option><option value="msaa">MSAA 4x</option></select></Row>
      <Row label={t("Ambient occlusion (heavy: about -15 to -35 FPS)", "एम्बिएंट ऑक्लूज़न (भारी, FPS घटेगा)")}><select value={g.ao} disabled={!g.post} onChange={e => gfx({ ao: e.target.value as never })}><option value="off">off</option><option value="half">{t("half resolution", "आधा रेज़ोल्यूशन")}</option><option value="full">{t("full resolution", "पूरा रेज़ोल्यूशन")}</option></select></Row>
      <Row label={t("Post-processing (bloom, grade)", "पोस्ट-प्रोसेसिंग")}><input type="checkbox" checked={g.post} onChange={e => gfx({ post: e.target.checked })} /></Row>
      <Row label={t(`View distance · ${g.viewDistance} m`, `देखने की दूरी · ${g.viewDistance} मी`)}><input type="range" min={200} max={1000} step={40} value={g.viewDistance} onChange={e => gfx({ viewDistance: +e.target.value })} /></Row>
      <Row label={t("Effects & crowd density", "इफ़ेक्ट और भीड़")}><select value={g.effects} onChange={e => gfx({ effects: e.target.value as never })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></Row>
      <Row label={t(`Resolution scale · ${Math.round(g.resScale * 100)}%`, `रेज़ोल्यूशन · ${Math.round(g.resScale * 100)}%`)}><input type="range" min={0.5} max={1} step={0.05} value={g.resScale} onChange={e => gfx({ resScale: +e.target.value })} /></Row>
      <Row label={t("Adaptive resolution", "अपने-आप रेज़ोल्यूशन")}><input type="checkbox" checked={g.adaptive} onChange={e => gfx({ adaptive: e.target.checked })} /></Row>
      <Row label={t("HDR sky reflections", "HDR आसमान परावर्तन")}><input type="checkbox" checked={g.ibl} onChange={e => gfx({ ibl: e.target.checked })} /></Row>
      <button className="btn-sm" type="button" onClick={() => set({ gfx: undefined })}>{t("Reset to preset", "प्रीसेट पर लौटाओ")}</button>
    </details>
    <Row label={t("Classic block characters (faster on old devices)", "पुराने ब्लॉक किरदार (कमज़ोर डिवाइस के लिए)")}><input type="checkbox" checked={!!st.classicCharacters} onChange={e => set({ classicCharacters: e.target.checked })} /></Row>
    <Row label={t("Vehicle headlights", "हेडलाइट")}><select value={st.headlights ?? "auto"} onChange={e => set({ headlights: e.target.value as never })}><option value="auto">{t("Auto (dusk to dawn)", "अपने-आप (शाम से सुबह)")}</option><option value="on">{t("Always on", "हमेशा चालू")}</option><option value="off">{t("Off", "बंद")}</option></select></Row>
    <Row label={t("City atmosphere", "शहर का माहौल")}><select value={st.atmosphere} onChange={e=>set({atmosphere:e.target.value as never})}><option value="cycle">Day / night cycle</option><option value="day">Daylight</option><option value="sunset">Golden hour</option><option value="night">Night</option></select></Row>
    <Row label={t("Camera sensitivity", "कैमरा संवेदनशीलता")}><input type="range" min={0.3} max={2.5} step={0.1} value={st.sensitivity} onChange={e => set({ sensitivity: +e.target.value })} /></Row>
    <Row label={t("Invert camera Y", "कैमरा Y उल्टा")}><input type="checkbox" checked={st.invertY} onChange={e => set({ invertY: e.target.checked })} /></Row>
    <Row label={t("Large text", "बड़ा टेक्स्ट")}><input type="checkbox" checked={st.largeText} onChange={e => set({ largeText: e.target.checked })} /></Row>
    <Row label={t("Reduce motion", "कम मोशन")}><input type="checkbox" checked={st.reduceMotion} onChange={e => set({ reduceMotion: e.target.checked })} /></Row>
    <Row label={t("Colour-blind friendly markers", "कलर-ब्लाइंड मार्कर")}><input type="checkbox" checked={st.colorblind} onChange={e => set({ colorblind: e.target.checked })} /></Row>
    <Row label={t("Touch controls", "टच कंट्रोल")}><input type="checkbox" checked={st.touch} onChange={e => set({ touch: e.target.checked })} /></Row>
    <Row label={t("Show FPS", "FPS दिखाओ")}><input type="checkbox" checked={st.showFps} onChange={e => set({ showFps: e.target.checked })} /></Row>
  </div>;
}
