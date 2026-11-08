"use client";
/** Ambient traffic: autos, cars and bikes looping on the road grid. Deterministic from the shared world clock, so every
 * client sees the same traffic with zero network cost. Purely visual (no collisions with players — they stay in lanes). */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { renderWorldTime } from "./syncedClock";
import * as THREE from "three";
import { type VehicleKind } from "@kanpurverse/shared";
import { getRoads, roadsNear, segPoint, segYaw, roadsVersion, onRoadsChange, type Seg } from "./roads";
import { VehicleMesh } from "./Vehicles";
import { useStore } from "../state/store";
import { playerPos } from "./refs";

interface Car { kind: VehicleKind; color: number; seg: Seg; lane: 1 | -1; offset: number; speed: number }
const KINDS: VehicleKind[] = ["auto", "erickshaw", "hatchback", "scooter", "bike", "sedan", "auto", "bus", "taxi", "scooter", "truck", "erickshaw"];
const COLORS = [0x2e8b57, 0xf2b134, 0xd8d8d8, 0x3d8bff, 0xc8102e, 0x1c1d22, 0x8fd1ff, 0xf5f5f5];

export function Traffic() {
  const quality = useStore(s => s.settings.quality); const [ver, setVer] = useState(roadsVersion()); useEffect(() => onRoadsChange(() => setVer(roadsVersion())), []);
  const [center, setCenter] = useState<[number, number]>([playerPos.x, playerPos.z]); useFrame(() => { if (Math.hypot(playerPos.x - center[0], playerPos.z - center[1]) > 150) setCenter([playerPos.x, playerPos.z]); });
  const cars = useMemo<Car[]>(() => { const n = quality === "low" ? 12 : quality === "medium" ? 24 : 36; const pool = roadsNear(center[0], center[1], 320).filter(s => s.len > 25 && s.cls !== "service" && s.cls !== "living_street"); const segs = pool.length ? pool : getRoads(); if (!segs.length) return [];
    return Array.from({ length: n }, (_, i) => ({ kind: KINDS[i % KINDS.length], color: COLORS[(i * 5) % COLORS.length], seg: segs[(i * 7) % segs.length], lane: i % 2 === 0 ? 1 : -1, offset: (i * 137) % 500, speed: 6 + (i % 4) * 2 })); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, ver, center]);
  return <>{cars.map((c, i) => <Car key={i + ":" + c.seg.a[0]} car={c} />)}</>;
}

const DAY_SEC = 86400;
function Car({ car }: { car: Car }) {
  const g = useRef<THREE.Group>(null); const hold = useRef<{ x: number; z: number } | null>(null); const stopped = useRef(false); const r = car.seg; const laneOff = (r.w / 4) * car.lane;
  useFrame(() => {
    if (!g.current) return; const t = renderWorldTime.v * DAY_SEC;
    const d = (car.offset + t * car.speed) % (r.len * 2); const fwd = d < r.len; const s = fwd ? d : r.len * 2 - d; // ping-pong along the segment
    const [x, z] = segPoint(r, s, laneOff * (fwd ? 1 : -1)); const yaw = segYaw(r, fwd);
    const ahead = ((playerPos.x - x) * r.dx + (playerPos.z - z) * r.dz) * (fwd ? 1 : -1); const lateral = Math.abs((playerPos.x - x) * r.nx + (playerPos.z - z) * r.nz);
    if (ahead > 0 && ahead < 7 && lateral < 2.2) { hold.current = hold.current ?? { x: g.current.position.x, z: g.current.position.z }; g.current.position.set(hold.current.x, 0.6, hold.current.z); stopped.current = true; return; } hold.current = null; stopped.current = false;
    g.current.position.set(x, 0.6, z); g.current.rotation.y = yaw;
  });
  return <group ref={g}><VehicleMesh kind={car.kind} color={car.color} wheelSpin stoppedRef={stopped} /></group>;
}
