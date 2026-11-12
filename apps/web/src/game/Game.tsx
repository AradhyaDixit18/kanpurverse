"use client";
import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { SceneLoading } from "./SceneLoading";
import { WorldClock } from "./WorldClock";
import { FrameProbe } from "./qa/FrameProbe";
import { GroundCollider } from "./GroundCollider";
import { VehicleQAWorld } from "./VehicleQAWorld";
import { City } from "./City";
import { StreetLife } from "./StreetLife";
import { PaanKiosk } from "./PaanKiosk";
import { Player } from "./Player";
import { NPCs } from "./NPCs";
import { Vehicles } from "./Vehicles";
import { Boulevard } from "./Boulevard";
import { FestivalChase } from "./FestivalChase";
import { StoryWorld } from "./StoryWorld";
import { Sky } from "./Sky";
import { MissionMarkers } from "./Missions";
import { Traffic } from "./Traffic";
import { Railway } from "./Railway";
import { Props } from "./Props";
import { Animals } from "./Animals";
import { Effects } from "./Effects";
import { NightLights } from "./NightLights";
import { Shops } from "./Shops";
import { Enemies } from "./Enemies";
import { SkidMarks } from "./SkidMarks";
import { GpsRuntime } from "./GpsRuntime";
import { Ganga } from "./Ganga";
import { CAMERA_NEAR } from "./layers";
import { Dust } from "./Dust";
import { Boundary } from "./Boundary";
import { OsmCity, useGeo } from "./OsmCity";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { bindInput } from "./input";
import { useStore, useGraphics, graphicsNow } from "../state/store";

function Bind() { const { gl } = useThree(); useEffect(() => bindInput(gl.domElement), [gl]); return null; }
function Fps() { const n = useRef(0); const t = useRef(performance.now()); useFrame(() => { n.current++; const now = performance.now(); if (now - t.current > 1000) { useStore.getState().set({ fps: Math.round(n.current * 1000 / (now - t.current)) }); n.current = 0; t.current = now; } }); return null; }

export function World() { const geo = useGeo(); return geo ? <OsmCity geo={geo} /> : <><City /><Railway /></>; }
function CameraFar() { const far = useGraphics().cameraFar; const { camera } = useThree(); useEffect(() => { (camera as THREE.PerspectiveCamera).far = far; camera.updateProjectionMatrix(); }, [far, camera]); return null; }
/** Adaptive resolution: steps the render DPR down when frame time stays above ~19 ms and back up when it recovers. */
/**
 * Adaptive resolution with hysteresis. Earlier version re-evaluated every 2 s in both directions, which could oscillate
 * (a visible resolution "pulse"). Now: step down only after two consecutive slow windows, step up only after 10 s of
 * clean frames, and never change more often than every 6 s.
 */
function AdaptiveResolution() {
  const setDpr = useThree(s => s.setDpr); const g = useGraphics(); const cur = useRef(g.dpr[1]); const acc = useRef<{ t: number; n: number; slow: number; slowWindows: number; cleanFor: number; lastChange: number; dropShare?: number; holdUntil?: number }>({ t: 0, n: 0, slow: 0, slowWindows: 0, cleanFor: 0, lastChange: 0 });
  useEffect(() => { cur.current = Math.min(window.devicePixelRatio, g.dpr[1]); setDpr(cur.current); }, [g.dpr, setDpr]);
  useFrame(({ clock }, dt) => { if (!g.adaptive) return; const a = acc.current; a.t += dt; a.n++; if (dt > 0.021) a.slow++; if (a.t < 2) return;
    const share = a.slow / a.n; a.t = 0; a.n = 0; a.slow = 0; a.slowWindows = share > 0.3 ? a.slowWindows + 1 : 0; a.cleanFor = share < 0.02 ? a.cleanFor + 2 : 0;
    const now = clock.elapsedTime; if (now - a.lastChange < 6) return; const max = Math.min(window.devicePixelRatio, g.dpr[1]), min = g.dpr[0];
    // CPU-bound guard: if the previous drop did not help, lowering resolution only blurs the image. Restore and hold.
    if (a.dropShare !== undefined && now - a.lastChange >= 6 && now - a.lastChange < 12) { if (share > a.dropShare * 0.8) { cur.current = Math.min(max, cur.current + 0.15); setDpr(cur.current); useStore.getState().set({ renderScale: cur.current }); a.holdUntil = now + 60; } a.dropShare = undefined; return; }
    if (now < (a.holdUntil ?? 0)) return;
    if (a.slowWindows >= 2 && cur.current > min + 0.01) { a.dropShare = share; cur.current = Math.max(min, cur.current - 0.15); a.lastChange = now; a.slowWindows = 0; setDpr(cur.current); useStore.getState().set({ renderScale: cur.current }); }
    else if (a.cleanFor >= 10 && cur.current < max - 0.01) { cur.current = Math.min(max, cur.current + 0.1); a.lastChange = now; a.cleanFor = 0; setDpr(cur.current); useStore.getState().set({ renderScale: cur.current }); } });
  return null;
}
function Ibl() { const period = useStore(s => { const h = s.worldTime * 24; return h < 5.5 || h > 19.5 ? "night" : h < 7.5 || h > 17 ? "sunset" : "day"; }); const ibl = useGraphics().ibl; if (!ibl) return null; const file = period === "night" ? "/hdr/moonless_golf.hdr" : period === "sunset" ? "/hdr/venice_sunset.hdr" : "/hdr/kloofendal_48d_partly_cloudy_puresky.hdr"; return <Boundary name="ibl"><Suspense fallback={null}><Environment key={file} files={file} background={false} environmentIntensity={period === "night" ? 0.25 : 0.6} /></Suspense></Boundary>; }

export function Game({ qaScenario }: { qaScenario?: "vehicles" } = {}) {
  const qa = process.env.NODE_ENV === "development" && qaScenario === "vehicles";
  const g = useGraphics();
  return (
    <Canvas data-engine="kanpurverse" shadows={g.shadows !== "off" ? (g.softShadows ? "soft" : true) : false} dpr={g.dpr} camera={{ fov: 60, near: CAMERA_NEAR, far: g.cameraFar, position: [0, 4, 10] }} gl={{ preserveDrawingBuffer: process.env.NODE_ENV === "development", antialias: graphicsNow().aa !== "off", powerPreference: "high-performance", stencil: false }} style={{ position: "fixed", inset: 0 }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; gl.shadowMap.type = graphicsNow().softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; }}>
      <Suspense fallback={<SceneLoading />}>
        <WorldClock /><Physics gravity={[0, -18, 0]} timeStep={1 / 60}>
          {qa ? <VehicleQAWorld /> : <><Sky /><Ibl /><Boundary name="world"><World /></Boundary><Boundary name="npcs"><NPCs /></Boundary><Boundary name="traffic"><Traffic /></Boundary><Boundary name="props"><Props /></Boundary><Boundary name="nightlights"><NightLights /></Boundary><Boundary name="shops"><Shops /></Boundary><Boundary name="enemies"><Enemies /></Boundary><SkidMarks /><Boundary name="gps"><GpsRuntime /></Boundary><Boundary name="ganga"><Ganga /></Boundary><Boundary name="animals"><Animals /></Boundary><MissionMarkers /></>}<GroundCollider /><Player /><StreetLife />{!qa && <><PaanKiosk /><Boulevard /></>}<Vehicles /><StoryWorld /><FestivalChase /><Dust />
        </Physics>
      </Suspense>
      {process.env.NODE_ENV === "development" && <FrameProbe />}<Effects /><Bind /><Fps /><CameraFar /><AdaptiveResolution />
    </Canvas>
  );
}
