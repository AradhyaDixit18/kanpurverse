"use client";
/**
 * GPS runtime: picks the destination (active mission objective, else the player's map waypoint), routes along roads,
 * re-routes when the player strays more than 25 m, and draws glowing chevrons on the road for the next ~150 m.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getRoads, roadsVersion, onRoadsChange } from "./roads";
import { buildRoadGraph, route, offRoute, type RoadGraph } from "./gps";
import { useStore } from "../state/store";
import { playerPos } from "./refs";
import { LAYER } from "./layers";

let graph: RoadGraph | null = null; let graphVer = -1;
export function roadGraph() { const v = roadsVersion(); if (!graph || graphVer !== v) { graph = buildRoadGraph(getRoads()); graphVer = v; } return graph; }

/** Current destination: mission objective first, then the map waypoint. */
export function currentDestination(): { p: [number, number]; label: string } | undefined {
  const s = useStore.getState(); const m = s.mission;
  if (m) { const cp = m.def.checkpoints[m.index]; if (cp) return { p: cp, label: s.settings.lang === "english" ? m.def.name : m.def.nameHi }; }
  return s.waypoint;
}

export function GpsRuntime() {
  const [ver, setVer] = useState(roadsVersion()); useEffect(() => onRoadsChange(() => setVer(roadsVersion())), []);
  const last = useRef({ t: 0, key: "" });
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current.t < 1) return; last.current.t = clock.elapsedTime; void ver;
    const s = useStore.getState(); const d = currentDestination();
    if (!d) { if (s.route) s.set({ route: undefined }); return; }
    if (Math.hypot(d.p[0] - playerPos.x, d.p[1] - playerPos.z) < 12) { if (s.waypoint && !s.mission) s.set({ waypoint: undefined, route: undefined }); return; }
    const key = `${d.p[0]},${d.p[1]}`; const off = s.route ? offRoute(s.route.pts, playerPos.x, playerPos.z).dist : Infinity;
    if (key === last.current.key && s.route && off < 25) return;
    if (!getRoads().length) return;
    const r = route(roadGraph(), [playerPos.x, playerPos.z], d.p); last.current.key = key;
    s.set({ route: { pts: r.pts, length: r.length, ok: r.ok, dest: d.p, label: d.label, at: Date.now() } });
  });
  return <GpsArrows />;
}

const N = 26;
function GpsArrows() {
  const mesh = useMemo(() => {
    const shape = new THREE.Shape([new THREE.Vector2(0, 0.9), new THREE.Vector2(0.75, -0.2), new THREE.Vector2(0.35, -0.2), new THREE.Vector2(0.35, -0.8), new THREE.Vector2(-0.35, -0.8), new THREE.Vector2(-0.35, -0.2), new THREE.Vector2(-0.75, -0.2)]);
    const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI);
    const m = new THREE.MeshBasicMaterial({ color: 0xffc83d, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -10 });
    const im = new THREE.InstancedMesh(g, m, N); im.count = 0; im.frustumCulled = false; im.renderOrder = 3; return im;
  }, []);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }, [mesh]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const r = useStore.getState().route; if (!r || useStore.getState().settings.gpsArrows === false) { mesh.count = 0; return; }
    const { seg } = offRoute(r.pts, playerPos.x, playerPos.z); let placed = 0; let next = (clock.elapsedTime * 4) % 6;
    for (let i = seg; i + 1 < r.pts.length && placed < N; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1]; const len = Math.hypot(bx - ax, bz - az); if (len < 0.01) continue; const yaw = Math.atan2(bx - ax, bz - az);
      let d = next; for (; d < len && placed < N; d += 6) { const t = d / len; o.position.set(ax + (bx - ax) * t, LAYER.decal + 0.03, az + (bz - az) * t); o.rotation.set(0, yaw, 0); o.scale.setScalar(1.1); o.updateMatrix(); mesh.setMatrixAt(placed++, o.matrix); }
      next = d - len;
    }
    mesh.count = placed; mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}
