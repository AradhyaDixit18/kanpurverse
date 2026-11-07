"use client";
import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { AdaptiveDpr } from "@react-three/drei";
import { City } from "./City";
import { Player } from "./Player";
import { NPCs } from "./NPCs";
import { Vehicles } from "./Vehicles";
import { RemotePlayers } from "./Remote";
import { Sky } from "./Sky";
import { MissionMarkers } from "./Missions";
import { Traffic } from "./Traffic";
import * as THREE from "three";
import { bindInput } from "./input";
import { useStore } from "../state/store";

function Bind() { const { gl } = useThree(); useEffect(() => bindInput(gl.domElement), [gl]); return null; }
function Fps() { const n = useRef(0); const t = useRef(performance.now()); useFrame(() => { n.current++; const now = performance.now(); if (now - t.current > 1000) { useStore.getState().set({ fps: Math.round(n.current * 1000 / (now - t.current)) }); n.current = 0; t.current = now; } }); return null; }

export function Game() {
  const quality = useStore(s => s.settings.quality);
  return (
    <Canvas shadows={quality !== "low"} dpr={quality === "high" ? [1, 2] : [0.75, 1.25]} camera={{ fov: 60, near: 0.1, far: 900, position: [0, 4, 10] }} gl={{ antialias: quality !== "low", powerPreference: "high-performance" }} style={{ position: "fixed", inset: 0 }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}>
      <Suspense fallback={null}>
        <Physics gravity={[0, -18, 0]} timeStep="vary">
          <Sky /><City /><Player /><NPCs /><Vehicles /><Traffic /><RemotePlayers /><MissionMarkers />
        </Physics>
      </Suspense>
      <Bind /><Fps /><AdaptiveDpr pixelated />
    </Canvas>
  );
}
