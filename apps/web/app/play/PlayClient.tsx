"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useStore } from "../../src/state/store";
import { MainMenu, LoadingScreen, ErrorScreen } from "../../src/ui/Menu";
const HUD = dynamic(() => import("../../src/ui/HUD").then(m => m.HUD), { ssr: false });

const Game = dynamic(() => import("../../src/game/Game").then(m => m.Game), { ssr: false, loading: () => <LoadingScreen /> });

export default function PlayClient() {
  const screen = useStore(s => s.screen); const [mounted, setMounted] = useState(false); const [webgl, setWebgl] = useState(true);
  useEffect(() => { setMounted(true); useStore.getState().set({ screen: "menu" }); try { const c = document.createElement("canvas"); setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl"))); } catch { setWebgl(false); } }, []);
  if (!mounted) return <LoadingScreen />;
  if (!webgl) return <div className="screen center"><div className="logo">KANPUR<span>VERSE</span></div><h2>WebGL is not available</h2><p className="muted">Enable hardware acceleration in your browser, or try Brave/Chrome/Safari on a newer device.</p></div>;
  if (screen === "menu" || screen === "character") return <MainMenu />;
  if (screen === "loading") return <LoadingScreen />;
  if (screen === "error") return <ErrorScreen />;
  return <><Game /><HUD /></>;
}
