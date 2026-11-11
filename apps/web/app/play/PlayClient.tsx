"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useStore } from "../../src/state/store";
import { EngineBoundary } from "../../src/ui/EngineBoundary";
import { MainMenu, LoadingScreen, ErrorScreen } from "../../src/ui/Menu";
import { loadGameEngine } from "../../src/game/engineLoader";
import { StreetCapture } from "../../src/game/qa/StreetCapture";
import { ReviewControls } from "../../src/game/qa/ReviewControls";
const HUD = dynamic(() => import("../../src/ui/HUD").then(m => m.HUD), { ssr: false });

const Game = dynamic(() => loadGameEngine().then(m => m.Game), { ssr: false, loading: () => <LoadingScreen /> });

export default function PlayClient() {
  const screen = useStore(s => s.screen); const [mounted, setMounted] = useState(false); const [webgl, setWebgl] = useState(true);
  useEffect(() => { setMounted(true); useStore.getState().set({ screen: "menu" }); try { const c = document.createElement("canvas"); setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl"))); } catch { setWebgl(false); } }, []);
  // Language-neutral splash before mount: the real LoadingScreen reads the persisted language, which the server cannot know (hydration #418).
  if (!mounted) return <div className="screen center" suppressHydrationWarning><div className="logo">KANPUR<span>VERSE</span></div><div className="muted">…</div></div>;
  if (!webgl) return <div className="screen center"><div className="logo">KANPUR<span>VERSE</span></div><h2>WebGL is not available</h2><p className="muted">Enable hardware acceleration in your browser, or try Brave/Chrome/Safari on a newer device.</p></div>;
  if (screen === "menu" || screen === "character") return <MainMenu />;
  if (screen === "loading") return <LoadingScreen />;
  if (screen === "error") return <ErrorScreen />;
  return <><EngineBoundary><Game /></EngineBoundary><HUD />{process.env.NODE_ENV === "development" && <><ReviewControls /><StreetCapture /></>}</>;
}
