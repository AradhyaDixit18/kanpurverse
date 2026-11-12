"use client";
/**
 * Night city lighting without hundreds of real lights:
 *  - sodium/LED streetlight arms on the existing electric poles (one instanced mesh for arms, one for lamp heads);
 *  - additive light pools on the road under each lamp (one instanced mesh, opacity follows the night factor);
 *  - `nightFactor()` is shared with OsmCity so lit windows and shop interiors fade in at dusk.
 * Everything is three draw calls regardless of lamp count.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { roadsNear, getRoads, segPoint, roadsVersion, onRoadsChange } from "./roads";
import { playerPos } from "./refs";
import { useStore } from "../state/store";
import { renderWorldTime } from "./syncedClock";
import { setCityNight } from "./OsmCity";

/** 0 by day, 1 at night; smooth through dusk (18:00–19:30) and dawn (05:15–06:30). */
export function nightFactor(t = renderWorldTime.v) {
  const h = (t % 1) * 24; const s = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  return h >= 12 ? s(18, 19.5, h) : 1 - s(5.25, 6.5, h);
}

let poolTex: THREE.Texture | null = null;
function poolTexture() {
  if (poolTex) return poolTex; const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,214,150,0.95)"); g.addColorStop(0.35, "rgba(255,190,120,0.45)"); g.addColorStop(1, "rgba(255,170,90,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); poolTex = new THREE.CanvasTexture(c); poolTex.colorSpace = THREE.SRGBColorSpace; return poolTex;
}

export function NightLights() {
  const effects = useStore(s => s.settings.quality);
  const [ver, setVer] = useState(roadsVersion()); useEffect(() => onRoadsChange(() => setVer(roadsVersion())), []);
  const [center, setCenter] = useState<[number, number]>([playerPos.x, playerPos.z]);
  useFrame(() => { if (Math.hypot(playerPos.x - center[0], playerPos.z - center[1]) > 140) setCenter([playerPos.x, playerPos.z]); });
  const lamps = useMemo(() => {
    const pool = roadsNear(center[0], center[1], 260).filter(s => s.len > 18 && s.cls !== "service"); const segs = pool.length ? pool : getRoads();
    const out: { p: [number, number]; road: [number, number]; rot: number }[] = [];
    // Same spacing as the electric poles in Props.tsx so every lamp hangs from a real pole.
    for (const r of segs) for (let d = 14; d < r.len; d += 36) out.push({ p: segPoint(r, d, r.w / 2 + 2.9), road: segPoint(r, d, r.w / 2 - 1.2), rot: Math.atan2(r.dx, r.dz) });
    return out.slice(0, 140); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, ver]);

  const mats = useMemo(() => ({
    arm: new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.6, metalness: 0.5 }),
    head: new THREE.MeshStandardMaterial({ color: 0xd8d2c4, emissive: 0xffc88a, emissiveIntensity: 0, roughness: 0.3 }),
    pool: new THREE.MeshBasicMaterial({ map: poolTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 }),
  }), []);
  const geos = useMemo(() => ({ arm: new THREE.BoxGeometry(0.08, 0.08, 2.6), head: new THREE.BoxGeometry(0.34, 0.12, 0.6), pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) }), []);
  useEffect(() => () => { for (const m of Object.values(mats)) m.dispose(); for (const g of Object.values(geos)) g.dispose(); }, [mats, geos]);
  const arm = useRef<THREE.InstancedMesh>(null), head = useRef<THREE.InstancedMesh>(null), pools = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const o = new THREE.Object3D(); const n = lamps.length;
    lamps.forEach((l, i) => {
      const dx = l.road[0] - l.p[0], dz = l.road[1] - l.p[1]; const yaw = Math.atan2(dx, dz);
      o.position.set(l.p[0] + dx * 0.32, 7.0, l.p[1] + dz * 0.32); o.rotation.set(0, yaw, 0); o.scale.set(1, 1, 1); o.updateMatrix(); arm.current?.setMatrixAt(i, o.matrix);
      o.position.set(l.p[0] + dx * 0.62, 6.92, l.p[1] + dz * 0.62); o.updateMatrix(); head.current?.setMatrixAt(i, o.matrix);
      o.position.set(l.road[0], 0.1, l.road[1]); o.rotation.set(0, l.rot, 0); o.scale.set(13, 1, 13); o.updateMatrix(); pools.current?.setMatrixAt(i, o.matrix);
    });
    for (const m of [arm.current, head.current, pools.current]) if (m) { m.count = n; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  }, [lamps]);

  useFrame(() => {
    const k = nightFactor(); setCityNight(k); mats.head.emissiveIntensity = 0.2 + k * 4.5; mats.pool.opacity = k * (effects === "low" ? 0.35 : 0.55);
    if (pools.current) pools.current.visible = k > 0.02;
  });
  const cap = 140;
  return <>
    <instancedMesh ref={arm} args={[geos.arm, mats.arm, cap]} castShadow frustumCulled={false} />
    <instancedMesh ref={head} args={[geos.head, mats.head, cap]} frustumCulled={false} />
    <instancedMesh ref={pools} args={[geos.pool, mats.pool, cap]} frustumCulled={false} renderOrder={2} />
  </>;
}
