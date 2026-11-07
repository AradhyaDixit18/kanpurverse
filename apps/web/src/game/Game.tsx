"use client";
import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { AdaptiveDpr } from "@react-three/drei";
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
import { OsmCity, useGeo } from "./OsmCity";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { bindInput } from "./input";
import { useStore } from "../state/store";

function Bind() { const { gl } = useThree(); useEffect(() => bindInput(gl.domElement), [gl]); return null; }
function Fps() { const n = useRef(0); const t = useRef(performance.now()); useFrame(() => { n.current++; const now = performance.now(); if (now - t.current > 1000) { useStore.getState().set({ fps: Math.round(n.current * 1000 / (now - t.current)) }); n.current = 0; t.current = now; } }); return null; }

function GroundCollider() { return <RigidBody type="fixed" colliders={false}><CuboidCollider args={[4000, 1, 4000]} position={[0, -1, 0]} /></RigidBody>; }
function World() { const geo = useGeo(); return geo ? <OsmCity geo={geo} /> : <><City /><Railway /></>; }
function Ibl() { const t = useStore(s => s.worldTime); const q = useStore(s => s.settings.quality); if (q === "low") return null; const h = t * 24; const file = h < 5.5 || h > 19.5 ? "/hdr/moonless_golf.hdr" : (h < 7.5 || h > 17) ? "/hdr/venice_sunset.hdr" : "/hdr/kloofendal_48d_partly_cloudy_puresky.hdr"; return <Environment files={file} background={false} environmentIntensity={h < 5.5 || h > 19.5 ? 0.25 : 0.6} />; }

export function Game() {
  const quality = useStore(s => s.settings.quality);
  return (
    <Canvas shadows={quality !== "low"} dpr={quality === "high" ? [1, 2] : [0.75, 1.25]} camera={{ fov: 60, near: 0.1, far: 900, position: [0, 4, 10] }} gl={{ antialias: quality !== "low", powerPreference: "high-performance" }} style={{ position: "fixed", inset: 0 }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}>
      <Suspense fallback={null}>
        <Physics gravity={[0, -18, 0]} timeStep="vary">
          <Sky /><Ibl /><GroundCollider /><World /><Player /><NPCs /><Vehicles /><Traffic /><Props /><Animals /><RemotePlayers /><MissionMarkers /><Dust />
        </Physics>
      </Suspense>
      <Effects /><Bind /><Fps /><AdaptiveDpr pixelated />
    </Canvas>
  );
}
