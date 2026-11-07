"use client";
/** Ambient traffic: autos, cars and bikes looping on the road grid. Deterministic from the shared world clock, so every
 * client sees the same traffic with zero network cost. Purely visual (no collisions with players — they stay in lanes). */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ROADS, type VehicleKind } from "@kanpurverse/shared";
import { VehicleMesh } from "./Vehicles";
import { useStore } from "../state/store";

interface Car { kind: VehicleKind; color: number; road: number; lane: 1 | -1; offset: number; speed: number }
const KINDS: VehicleKind[] = ["auto", "auto", "hatchback", "scooter", "bike", "sedan", "auto", "hatchback"];
const COLORS = [0x2e8b57, 0xf2b134, 0xd8d8d8, 0x3d8bff, 0xc8102e, 0x1c1d22, 0x8fd1ff, 0xf5f5f5];

export function Traffic() {
  const quality = useStore(s => s.settings.quality);
  const cars = useMemo<Car[]>(() => { const n = quality === "low" ? 10 : quality === "medium" ? 18 : 26; return Array.from({ length: n }, (_, i) => ({ kind: KINDS[i % KINDS.length], color: COLORS[(i * 5) % COLORS.length], road: i % ROADS.length, lane: i % 2 === 0 ? 1 : -1, offset: (i * 137) % 500, speed: 6 + (i % 4) * 2 })); }, [quality]);
  return <>{cars.map((c, i) => <Car key={i} car={c} />)}</>;
}

const DAY_SEC = 86400;
function Car({ car }: { car: Car }) {
  const g = useRef<THREE.Group>(null); const r = ROADS[car.road]; const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); const horizontal = r.a[1] === r.b[1];
  const laneOff = (r.w / 4) * car.lane;
  useFrame(() => {
    if (!g.current) return; const t = useStore.getState().worldTime * DAY_SEC; // seconds into the day, shared by all clients
    let d = (car.offset + t * car.speed) % (len * 2); const fwd = d < len; if (!fwd) d = d - len; const s = fwd ? d : len - d; // ping-pong along the road
    const dirSign = (fwd ? 1 : -1) * car.lane; const off = laneOff * (fwd ? 1 : -1);
    const x = horizontal ? r.a[0] + s : r.a[0] + off, z = horizontal ? r.a[1] + off : r.a[1] + s;
    g.current.position.set(x, 0.6, z); g.current.rotation.y = horizontal ? (dirSign > 0 ? Math.PI / 2 : -Math.PI / 2) * (fwd ? 1 : 1) * (car.lane) : (dirSign > 0 ? 0 : Math.PI);
    if (horizontal) g.current.rotation.y = fwd ? Math.PI / 2 : -Math.PI / 2; else g.current.rotation.y = fwd ? 0 : Math.PI;
  });
  return <group ref={g}><VehicleMesh kind={car.kind} color={car.color} wheelSpin /></group>;
}
