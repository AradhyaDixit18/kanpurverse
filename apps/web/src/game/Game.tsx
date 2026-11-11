"use client";
import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { AdaptiveDpr } from "@react-three/drei";
import { SceneLoading } from "./SceneLoading";
import { WorldClock } from "./WorldClock";
import { FrameProbe } from "./qa/FrameProbe";
import { GroundCollider } from "./GroundCollider";
import { VehicleQAWorld } from "./VehicleQAWorld";
import { City } from "./City";
import { Player } from "./Player";
import { NPCs } from "./NPCs";
import { Vehicles } from "./Vehicles";
import { RemotePlayers } from "./Remote";
import { Sky } from "./Sky";
import { MissionMarkers } from "./Missions";
import { Traffic } from "./Traffic";
import { Railway } from "./Railway";
import { Props } from "./Props";
import { Animals } from "./Animals";
import { Effects } from "./Effects";
import { Dust } from "./Dust";
import { Boundary } from "./Boundary";
import { OsmCity, useGeo } from "./OsmCity";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { bindInput } from "./input";
import { useStore } from "../state/store";

function Bind() { const { gl } = useThree(); useEffect(() => bindInput(gl.domElement), [gl]); return null; }
function Fps() { const n = useRef(0); const t = useRef(performance.now()); useFrame(() => { n.current++; const now = performance.now(); if (now - t.current > 1000) { useStore.getState().set({ fps: Math.round(n.current * 1000 / (now - t.current)) }); n.current = 0; t.current = now; } }); return null; }

export function World() { const geo = useGeo(); return geo ? <OsmCity geo={geo} /> : <><City /><Railway /></>; }
function Ibl() { const period = useStore(s => { const h = s.worldTime * 24; return h < 5.5 || h > 19.5 ? "night" : h < 7.5 || h > 17 ? "sunset" : "day"; }); const q = useStore(s => s.settings.quality); if (q === "low") return null; const file = period === "night" ? "/hdr/moonless_golf.hdr" : period === "sunset" ? "/hdr/venice_sunset.hdr" : "/hdr/kloofendal_48d_partly_cloudy_puresky.hdr"; return <Boundary name="ibl"><Suspense fallback={null}><Environment key={file} files={file} background={false} environmentIntensity={period === "night" ? 0.25 : 0.6} /></Suspense></Boundary>; }

export function Game({ qaScenario }: { qaScenario?: "vehicles" } = {}) {
  const qa = process.env.NODE_ENV === "development" && qaScenario === "vehicles";
  const quality = useStore(s => s.settings.quality);
  return (
    <Canvas shadows={quality !== "low"} dpr={quality === "high" ? [1, 1.75] : quality === "low" ? [0.75, 1] : [1, 1.25]} camera={{ fov: 60, near: 0.1, far: 900, position: [0, 4, 10] }} gl={{ antialias: quality !== "low", powerPreference: "high-performance" }} style={{ position: "fixed", inset: 0 }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}>
      <Suspense fallback={<SceneLoading />}>
        <WorldClock /><Physics gravity={[0, -18, 0]} timeStep={1 / 60}>
          {qa ? <VehicleQAWorld /> : <><Sky /><Ibl /><Boundary name="world"><World /></Boundary><Boundary name="npcs"><NPCs /></Boundary><Boundary name="traffic"><Traffic /></Boundary><Boundary name="props"><Props /></Boundary><Boundary name="animals"><Animals /></Boundary><MissionMarkers /></>}<GroundCollider /><Player /><Vehicles /><RemotePlayers /><Dust />
        </Physics>
      </Suspense>
      {process.env.NODE_ENV === "development" && <FrameProbe />}<Effects /><Bind /><Fps /><AdaptiveDpr />
    </Canvas>
  );
}
