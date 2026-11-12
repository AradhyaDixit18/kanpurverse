"use client";
/** One controls reference used by the main menu and the in-game help panel: on foot, driving, gamepad, story. */
import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { gamepad } from "../game/input";

type Row = [string, string, string];
const FOOT: Row[] = [["W A S D / arrows", "move", "चलो"], ["Shift", "sprint", "दौड़ो"], ["Space", "jump", "कूदो"], ["Mouse (click to lock)", "look", "कैमरा"], ["E", "talk · enter vehicle · story action", "बात · गाड़ी में बैठो · कहानी"], ["1–6", "emotes", "इमोट"], ["Q (hold)", "look back", "पीछे देखो"]];
const DRIVE: Row[] = [["W / ↑", "accelerate", "रफ़्तार"], ["S / ↓", "brake, then reverse", "ब्रेक, फिर रिवर्स"], ["A D / ← →", "steer", "स्टीयर"], ["Space", "handbrake (slide)", "हैंडब्रेक"], ["F or E", "exit vehicle (when stopped)", "उतरो (रुककर)"], ["H", "horn", "हॉर्न"], ["L", "headlights: auto / on / off", "हेडलाइट: ऑटो / चालू / बंद"], ["Z / X / B", "left / right indicator / hazards", "बायाँ / दायाँ इंडिकेटर / हैज़र्ड"], ["C", "camera: chase / close / far / first-person", "कैमरा: पीछे / पास / दूर / ड्राइवर"], ["R", "reset vehicle when stuck", "फँसी गाड़ी रीसेट"]];
const GAME: Row[] = [["Esc", "pause", "रोको"], ["M", "map", "नक्शा"], ["J", "story & missions", "कहानी और मिशन"], ["I", "inventory", "इन्वेंटरी"], ["P", "photo mode", "फ़ोटो मोड"], ["F1", "this help", "मदद"], ["E / Space · Esc", "cutscene: next · skip", "कटसीन: आगे · छोड़ो"]];
const PAD: Row[] = [["Left stick", "move / steer", "चलो / स्टीयर"], ["RT / LT", "accelerate / brake-reverse", "रफ़्तार / ब्रेक"], ["Right stick", "camera", "कैमरा"], ["A", "jump · handbrake", "कूदो · हैंडब्रेक"], ["X", "interact · enter", "बात · बैठो"], ["B", "exit vehicle", "उतरो"], ["Y", "camera mode", "कैमरा मोड"], ["LB · RB", "horn · headlights", "हॉर्न · हेडलाइट"], ["D-pad ← → ↑", "indicators · reset", "इंडिकेटर · रीसेट"], ["Start · Back", "pause · map", "रोको · नक्शा"]];

export function ControlsGuide() {
  const en = useStore(s => s.settings.lang === "english"); const [pad, setPad] = useState(false);
  useEffect(() => { const i = setInterval(() => setPad(gamepad.connected), 1000); return () => clearInterval(i); }, []);
  const Section = ({ title, rows }: { title: string; rows: Row[] }) => <section className="ctl-sec"><h3>{title}</h3><div className="help-grid">{rows.map(([k, a, h]) => <div key={k}><kbd>{k}</kbd> {en ? a : h}</div>)}</div></section>;
  return <div className="controls-guide">
    <Section title={en ? "On foot" : "पैदल"} rows={FOOT} />
    <Section title={en ? "Driving" : "गाड़ी चलाना"} rows={DRIVE} />
    <Section title={en ? "Game" : "गेम"} rows={GAME} />
    <Section title={`${en ? "Gamepad" : "गेमपैड"}${pad ? (en ? " · connected" : " · जुड़ा है") : ""}`} rows={PAD} />
    <p className="muted small">{en ? "Each vehicle class handles differently: scooters are nimble, SUVs feel planted, buses and trucks need wide turns, the e-rickshaw is slow and steady." : "हर गाड़ी अलग चलती है: स्कूटर फुर्तीला, SUV भारी, बस-ट्रक को चौड़ा मोड़ चाहिए, ई-रिक्शा धीमा और स्थिर।"}</p>
  </div>;
}
