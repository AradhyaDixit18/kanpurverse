"use client";
import { useStore } from "../state/store";
import { speak } from "../audio/voice";
import { linesFor } from "../game/dialogueData";

export function SettingsPanel() {
  const st = useStore(s => s.settings); const set = useStore(s => s.setSettings); const lang = st.lang; const t = (en: string, hi: string) => lang === "english" ? en : hi;
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="srow"><span>{label}</span>{children}</label>;
  return <div className="settings">
    <Row label={t("Dialogue language", "संवाद भाषा")}><select value={st.lang} onChange={e => set({ lang: e.target.value as never })}><option value="kanpuriya">Kanpuriya Hindi (कनपुरिया)</option><option value="hindi">Standard Hindi (हिंदी)</option><option value="english">English</option></select></Row>
    <Row label={t("Clean Language Mode", "साफ़ भाषा मोड")}><input type="checkbox" checked={st.cleanLanguage} onChange={e => set({ cleanLanguage: e.target.checked })} /></Row>
    <Row label={t("Subtitles", "सबटाइटल")}><input type="checkbox" checked={st.subtitles} onChange={e => set({ subtitles: e.target.checked })} /></Row>
    <Row label={t("NPC voice", "एनपीसी आवाज़")}><input type="checkbox" checked={st.voice} onChange={e => set({ voice: e.target.checked })} /></Row>
    <Row label={t("Test voice", "आवाज़ सुनो")}><button className="btn-sm" type="button" onClick={() => { const l = linesFor(st.lang).find(x => x.id === "guide_babloo.greet_1"); if (l) speak(l, "guide_babloo"); }}>▶</button></Row>
    <Row label={t("Music", "संगीत")}><input type="range" min={0} max={1} step={0.05} value={st.music} onChange={e => set({ music: +e.target.value })} /></Row>
    <Row label={t("Dialogue volume", "संवाद की आवाज़")}><input type="range" min={0} max={1} step={0.05} value={st.dialogue} onChange={e => set({ dialogue: +e.target.value })} /></Row>
    <Row label={t("Environment sounds", "माहौल की आवाज़ें")}><input type="range" min={0} max={1} step={0.05} value={st.ambience} onChange={e => set({ ambience: +e.target.value })} /></Row>
    <Row label={t("Sound effects", "ध्वनि प्रभाव")}><input type="range" min={0} max={1} step={0.05} value={st.sfx} onChange={e => set({ sfx: +e.target.value })} /></Row>
    <Row label={t("Graphics quality", "ग्राफ़िक्स")}><select value={st.quality} onChange={e => set({ quality: e.target.value as never })}><option value="low">{t("Low (phones)", "कम (फ़ोन)")}</option><option value="medium">{t("Medium", "मध्यम")}</option><option value="high">{t("High", "उच्च")}</option></select></Row>
    <Row label={t("Camera sensitivity", "कैमरा संवेदनशीलता")}><input type="range" min={0.3} max={2.5} step={0.1} value={st.sensitivity} onChange={e => set({ sensitivity: +e.target.value })} /></Row>
    <Row label={t("Invert camera Y", "कैमरा Y उल्टा")}><input type="checkbox" checked={st.invertY} onChange={e => set({ invertY: e.target.checked })} /></Row>
    <Row label={t("Large text", "बड़ा टेक्स्ट")}><input type="checkbox" checked={st.largeText} onChange={e => set({ largeText: e.target.checked })} /></Row>
    <Row label={t("Reduce motion", "कम मोशन")}><input type="checkbox" checked={st.reduceMotion} onChange={e => set({ reduceMotion: e.target.checked })} /></Row>
    <Row label={t("Colour-blind friendly markers", "कलर-ब्लाइंड मार्कर")}><input type="checkbox" checked={st.colorblind} onChange={e => set({ colorblind: e.target.checked })} /></Row>
    <Row label={t("Touch controls", "टच कंट्रोल")}><input type="checkbox" checked={st.touch} onChange={e => set({ touch: e.target.checked })} /></Row>
    <Row label={t("Show FPS", "FPS दिखाओ")}><input type="checkbox" checked={st.showFps} onChange={e => set({ showFps: e.target.checked })} /></Row>
  </div>;
}
