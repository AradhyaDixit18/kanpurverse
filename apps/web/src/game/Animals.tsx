"use client";
/**
 * Street wildlife renderer: desi cattle, street dogs and goats on the ground; pigeons, crows and black kites in the air.
 * Where animals live and how they move is decided in wildlife.ts (pure, tested); this file only draws it.
 *
 * Every species is drawn with instanced part meshes (torso, head, legs, tail; body and two wings for birds), so the
 * whole system costs 15 draw calls however many animals are in range. The previous version built each cow from ~17
 * separate meshes (8 cows and 6 dogs were ~190 draw calls) and ran on the world clock, which froze every animal
 * whenever the atmosphere was fixed to day, sunset or night.
 *
 * Cost control: animals are drawn only inside WILDLIFE.draw[quality] metres and animated every frame only inside
 * WILDLIFE.active[quality]; between the two they are re-posed twice a second. Nothing is drawn beyond the range.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { roadsNear, roadsVersion, onRoadsChange } from "./roads";
import { useStore } from "../state/store";
import { playerPos, playerYaw } from "./refs";
import { LAYER } from "./layers";
import { streetPoles } from "./propPlacement";
import { WILDLIFE, wildlifeAround, grazerPose, dogPose, pigeonPose, kitePose, crowPose, gateStep, newGate, inFrontOf, hash, type Gate, type GroundPose, type BirdPose, type RoadQuery, type WildQuality, type Grazer, type Dog, type Flock } from "./wildlife";

// ───────────────────────── geometry ─────────────────────────
type V3 = [number, number, number];
interface BoxSpec { s: V3; p: V3; c?: number; r?: V3 }
const COAT = 0xffffff, HOOF = 0x3a3530, HORN = 0xe6d5b8, MUZZLE = 0xd8a7a0;
function paint(g: THREE.BufferGeometry, hex: number) { const c = new THREE.Color(hex), n = g.getAttribute("position").count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g; }
function boxes(list: BoxSpec[]) {
  const parts = list.map(b => { const g = new THREE.BoxGeometry(b.s[0], b.s[1], b.s[2]); if (b.r) { g.rotateX(b.r[0]); g.rotateY(b.r[1]); g.rotateZ(b.r[2]); } g.translate(b.p[0], b.p[1], b.p[2]); return paint(g, b.c ?? COAT); });
  const merged = mergeGeometries(parts); parts.forEach(g => g.dispose()); if (!merged) throw new Error("wildlife: could not merge part geometry"); return merged;
}
const pair = (s: V3, p: V3, c?: number, r?: V3): BoxSpec[] => [{ s, p, c, r }, { s, p: [-p[0], p[1], p[2]], c, r: r && [r[0], -r[1], -r[2]] }];

/** Animal-local frame: +z forward, y = 0 at the ground when standing. Part pivots sit on the joints. */
interface Rig { torso: THREE.BufferGeometry; head: THREE.BufferGeometry; leg: THREE.BufferGeometry; tail: THREE.BufferGeometry; hips: V3[]; neck: V3; tailAt: V3; /** how far the body lowers to lie down */ drop: number; swing: number; tailRest: number; tints: number[] }
function buildRigs(): Record<"cattle" | "goat" | "dog", Rig> {
  const hips = (x: number, y: number, zf: number, zr: number): V3[] => [[x, y, zf], [-x, y, zf], [x, y, zr], [-x, y, zr]];
  return {
    cattle: { // zebu: shoulder hump, dewlap, short up-swept horns
      torso: boxes([{ s: [0.6, 0.66, 1.6], p: [0, 1.01, 0] }, { s: [0.3, 0.2, 0.42], p: [0, 1.42, 0.42] }, { s: [0.12, 0.3, 0.5], p: [0, 0.72, 0.55] }]),
      head: boxes([{ s: [0.26, 0.34, 0.44], p: [0, -0.02, 0.16] }, { s: [0.28, 0.3, 0.42], p: [0, -0.06, 0.52] }, { s: [0.2, 0.18, 0.14], p: [0, -0.12, 0.78], c: MUZZLE }, ...pair([0.05, 0.26, 0.05], [0.13, 0.2, 0.4], HORN, [-0.3, 0, -0.35]), ...pair([0.2, 0.05, 0.1], [0.24, 0.04, 0.36])]),
      leg: boxes([{ s: [0.14, 0.62, 0.16], p: [0, -0.31, 0] }, { s: [0.15, 0.08, 0.17], p: [0, -0.64, 0], c: HOOF }]),
      tail: boxes([{ s: [0.05, 0.7, 0.05], p: [0, -0.35, 0] }, { s: [0.08, 0.16, 0.08], p: [0, -0.76, 0], c: HOOF }]),
      hips: hips(0.2, 0.68, 0.58, -0.6), neck: [0, 1.2, 0.78], tailAt: [0, 1.28, -0.8], drop: 0.56, swing: 0.35, tailRest: 0.12, tints: [0xf2ede2, 0xd9c2a3, 0x9a8f86, 0x8b6b4a, 0xe8e4dc],
    },
    goat: {
      torso: boxes([{ s: [0.26, 0.3, 0.68], p: [0, 0.53, 0] }]),
      head: boxes([{ s: [0.13, 0.26, 0.14], p: [0, 0.1, 0.04] }, { s: [0.15, 0.17, 0.25], p: [0, 0.24, 0.14] }, ...pair([0.035, 0.17, 0.035], [0.05, 0.38, 0.06], 0x8a7a66, [-0.5, 0, 0]), ...pair([0.14, 0.04, 0.07], [0.13, 0.24, 0.08]), { s: [0.04, 0.1, 0.04], p: [0, 0.12, 0.22] }]),
      leg: boxes([{ s: [0.07, 0.36, 0.08], p: [0, -0.18, 0] }, { s: [0.075, 0.05, 0.085], p: [0, -0.375, 0], c: 0x2e2a27 }]),
      tail: boxes([{ s: [0.05, 0.12, 0.05], p: [0, 0.06, 0] }]),
      hips: hips(0.1, 0.4, 0.24, -0.26), neck: [0, 0.64, 0.32], tailAt: [0, 0.68, -0.34], drop: 0.33, swing: 0.45, tailRest: -0.4, tints: [0x2b2623, 0xeee8dc, 0x7a5a3c, 0x55504a],
    },
    dog: { // Indian street dog: lean body, pricked ears, tail carried up
      torso: boxes([{ s: [0.22, 0.24, 0.6], p: [0, 0.44, 0] }, { s: [0.2, 0.2, 0.2], p: [0, 0.42, 0.22] }]),
      head: boxes([{ s: [0.14, 0.16, 0.18], p: [0, 0.03, 0.07] }, { s: [0.17, 0.16, 0.2], p: [0, 0.08, 0.22] }, { s: [0.09, 0.08, 0.14], p: [0, 0.04, 0.38], c: 0x6b5a4a }, ...pair([0.05, 0.1, 0.03], [0.07, 0.2, 0.16])]),
      leg: boxes([{ s: [0.07, 0.34, 0.07], p: [0, -0.17, 0] }]),
      tail: boxes([{ s: [0.04, 0.3, 0.04], p: [0, 0.15, 0] }]),
      hips: hips(0.09, 0.34, 0.2, -0.22), neck: [0, 0.52, 0.3], tailAt: [0, 0.54, -0.3], drop: 0.27, swing: 0.6, tailRest: -0.7, tints: [0xc9a66b, 0x4a3b30, 0xe3dccf, 0x8b6b4a],
    },
  };
}
function wingGeometry(side: 1 | -1) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0.07, 0, 0, -0.09, 0.34 * side, 0, -0.03]), 3)); g.computeVertexNormals(); return paint(g, COAT); }

// ───────────────────────── instanced drawing ─────────────────────────
const _root = new THREE.Object3D(), _part = new THREE.Object3D(), _m = new THREE.Matrix4(), _zero = new THREE.Matrix4().makeScale(0, 0, 0), _c = new THREE.Color();
function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, max: number, shadow: boolean) { const m = new THREE.InstancedMesh(geometry, material, max); m.frustumCulled = false; m.castShadow = shadow; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; }
/** Write the matrix of a part that hangs off the current `_root` at `at`, rotated about its own joint. */
function put(mesh: THREE.InstancedMesh, i: number, at: V3, rx: number, ry = 0, rz = 0, sx = 1) { _part.position.set(at[0], at[1], at[2]); _part.rotation.set(rx, ry, rz); _part.scale.set(sx, 1, 1); _part.updateMatrix(); mesh.setMatrixAt(i, _m.multiplyMatrices(_root.matrix, _part.matrix)); }

class Herd {
  readonly torso: THREE.InstancedMesh; readonly head: THREE.InstancedMesh; readonly leg: THREE.InstancedMesh; readonly tail: THREE.InstancedMesh; readonly meshes: THREE.InstancedMesh[];
  constructor(readonly rig: Rig, readonly max: number, material: THREE.Material) {
    this.torso = instanced(rig.torso, material, max, true); this.head = instanced(rig.head, material, max, false); this.leg = instanced(rig.leg, material, max * 4, false); this.tail = instanced(rig.tail, material, max, false);
    this.meshes = [this.torso, this.head, this.leg, this.tail];
  }
  /** New layout: `tints[i]` picks each animal's coat. Every slot starts hidden. */
  reset(tints: number[]) { const n = Math.min(tints.length, this.max); this.torso.count = this.head.count = this.tail.count = n; this.leg.count = n * 4;
    for (let i = 0; i < n; i++) { _c.set(this.rig.tints[tints[i] % this.rig.tints.length]); this.torso.setColorAt(i, _c); this.head.setColorAt(i, _c); this.tail.setColorAt(i, _c); for (let k = 0; k < 4; k++) this.leg.setColorAt(i * 4 + k, _c); this.hide(i); }
    for (const m of this.meshes) { if (m.instanceColor) m.instanceColor.needsUpdate = true; } this.flush(); }
  hide(i: number) { this.torso.setMatrixAt(i, _zero); this.head.setMatrixAt(i, _zero); this.tail.setMatrixAt(i, _zero); for (let k = 0; k < 4; k++) this.leg.setMatrixAt(i * 4 + k, _zero); }
  pose(i: number, p: GroundPose, yaw: number, look: number, t: number) {
    const r = this.rig; _root.position.set(p.x, LAYER.pavement - r.drop * p.down, p.z); _root.rotation.set(0, yaw, 0); _root.scale.setScalar(1); _root.updateMatrix();
    this.torso.setMatrixAt(i, _root.matrix);
    put(this.head, i, r.neck, p.head, look);
    for (let k = 0; k < 4; k++) { const diagonal = k === 0 || k === 3 ? 0 : Math.PI; const walk = Math.sin(p.phase + diagonal) * r.swing * p.gait; put(this.leg, i * 4 + k, r.hips[k], walk * (1 - p.down) - 1.45 * p.down); } // lying: legs folded forward under the body
    put(this.tail, i, r.tailAt, r.tailRest + Math.sin(t * 2.3 + i) * 0.12, 0, Math.sin(t * 1.7 + i * 2) * 0.28);
  }
  flush() { for (const m of this.meshes) m.instanceMatrix.needsUpdate = true; }
  dispose() { for (const m of this.meshes) m.dispose(); }
}

class Swarm {
  readonly body: THREE.InstancedMesh; readonly left: THREE.InstancedMesh; readonly right: THREE.InstancedMesh; readonly meshes: THREE.InstancedMesh[];
  constructor(readonly max: number, geo: { body: THREE.BufferGeometry; left: THREE.BufferGeometry; right: THREE.BufferGeometry }, material: THREE.Material) {
    this.body = instanced(geo.body, material, max, false); this.left = instanced(geo.left, material, max, false); this.right = instanced(geo.right, material, max, false); this.meshes = [this.body, this.left, this.right];
  }
  pose(i: number, p: BirdPose, scale: number, tint: number) {
    _root.position.set(p.x, p.y, p.z); _root.rotation.set(0, p.yaw, p.bank); _root.scale.setScalar(scale); _root.updateMatrix(); this.body.setMatrixAt(i, _root.matrix);
    const folded = p.flying ? 1 : 0.4; put(this.left, i, [0.04, 0.02, 0], 0, 0, p.wing, folded); put(this.right, i, [-0.04, 0.02, 0], 0, 0, -p.wing, folded);
    _c.set(tint); for (const m of this.meshes) m.setColorAt(i, _c);
  }
  hide(i: number) { for (const m of this.meshes) m.setMatrixAt(i, _zero); }
  flush(count: number) { for (const m of this.meshes) { m.count = Math.min(count, this.max); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
  dispose() { for (const m of this.meshes) m.dispose(); }
}

const PIGEON = [0x7b808a, 0x9aa0a8, 0x5e636c], CROW = 0x15151a, KITE = 0x6b4a2e;
const wrapAngle = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const MAX_CROWS = 16, MAX_KITES = 5;

export function Animals() {
  const q = useStore(s => s.settings.quality) as WildQuality;
  const [ver, setVer] = useState(roadsVersion()); useEffect(() => onRoadsChange(() => setVer(roadsVersion())), []);
  const [center, setCenter] = useState<[number, number]>([playerPos.x, playerPos.z]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `ver` is the road network's change counter
  const life = useMemo(() => wildlifeAround(center[0], center[1], WILDLIFE.draw[q] + 70, roadsNear as RoadQuery), [center, ver, q]);

  const gpu = useMemo(() => {
    const rigs = buildRigs(); const fur = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }); const feather = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
    const bird = { body: boxes([{ s: [0.09, 0.08, 0.22], p: [0, 0, 0] }, { s: [0.07, 0.07, 0.07], p: [0, 0.05, 0.13] }, { s: [0.07, 0.02, 0.12], p: [0, 0, -0.16] }]), left: wingGeometry(1), right: wingGeometry(-1) };
    const herds = { cattle: new Herd(rigs.cattle, WILDLIFE.max.cattle, fur), goat: new Herd(rigs.goat, WILDLIFE.max.goat, fur), dog: new Herd(rigs.dog, WILDLIFE.max.dog, fur) };
    const birds = new Swarm(WILDLIFE.max.flocks * WILDLIFE.max.flock + MAX_CROWS + MAX_KITES, bird, feather);
    const dispose = () => { for (const h of Object.values(herds)) h.dispose(); birds.dispose(); for (const r of Object.values(rigs)) { r.torso.dispose(); r.head.dispose(); r.leg.dispose(); r.tail.dispose(); } bird.body.dispose(); bird.left.dispose(); bird.right.dispose(); fur.dispose(); feather.dispose(); };
    return { herds, birds, dispose };
  }, []);
  useEffect(() => gpu.dispose, [gpu]);

  const S = useRef({ t: 0, frame: 0, gates: new Map<string, Gate>(), yaw: new Map<string, number>(), at: new Map<string, [number, number]>(), visible: new Set<string>(),
    lists: { cattle: [] as Grazer[], goat: [] as Grazer[], dog: [] as Dog[], flocks: [] as Flock[] }, kite: [playerPos.x, playerPos.z] as [number, number], perches: [] as V3[], polesVer: -1, perchAt: [Infinity, Infinity] as [number, number] });

  // A new layout (the player moved on, the map loaded, or the quality changed): re-slot the instances. Gates persist
  // by animal id, so an animal already in view stays in view and one being held hidden stays hidden.
  useEffect(() => {
    const st = S.current; const cattle = life.grazers.filter(g => g.kind === "cattle"), goat = life.grazers.filter(g => g.kind === "goat");
    st.lists = { cattle, goat, dog: life.dogs, flocks: life.flocks }; st.visible.clear();
    gpu.herds.cattle.reset(cattle.map(g => g.tint)); gpu.herds.goat.reset(goat.map(g => g.tint)); gpu.herds.dog.reset(life.dogs.map(d => d.tint));
    const keep = new Set<string>([...life.grazers, ...life.dogs, ...life.flocks].map(a => a.id)); for (const m of [st.gates, st.yaw, st.at]) for (const id of m.keys()) if (!keep.has(id)) m.delete(id);
  }, [life, gpu]);

  useFrame((_, dtRaw) => {
    const st = S.current; const dt = Math.min(dtRaw, 0.1); st.t += dt; st.frame++; const t = st.t;
    const px = playerPos.x, pz = playerPos.z, heading = playerYaw.v; const draw = WILDLIFE.draw[q], active = WILDLIFE.active[q];
    if (Math.hypot(px - center[0], pz - center[1]) > 60) setCenter([px, pz]);

    for (const kind of ["cattle", "goat", "dog"] as const) {
      const herd = gpu.herds[kind], list = st.lists[kind]; let dirty = false; const n = Math.min(list.length, herd.max);
      for (let i = 0; i < n; i++) {
        const a = list[i]; const last = st.at.get(a.id); const ax = last ? last[0] : a.kind === "dog" ? a.ax : a.x, az = last ? last[1] : a.kind === "dog" ? a.az : a.z; const d = Math.hypot(ax - px, az - pz);
        const g0 = st.gates.get(a.id) ?? newGate(), g1 = gateStep(g0, d, inFrontOf(px, pz, heading, ax, az), draw); if (g1 !== g0 || !st.gates.has(a.id)) st.gates.set(a.id, g1);
        if (!g1.shown) { if (st.visible.delete(a.id)) { herd.hide(i); dirty = true; } continue; }
        const fresh = !st.visible.has(a.id); if (!fresh && d > active && (st.frame + i * 7) % 30 !== 0) continue; // far band: re-pose twice a second
        const p = a.kind === "dog" ? dogPose(a, t) : grazerPose(a, t);
        const y0 = st.yaw.get(a.id); const yaw = fresh || y0 === undefined || d > active ? p.yaw : y0 + wrapAngle(p.yaw - y0) * (1 - Math.exp(-dt * 3)); st.yaw.set(a.id, yaw);
        if (last) { last[0] = p.x; last[1] = p.z; } else st.at.set(a.id, [p.x, p.z]); st.visible.add(a.id);
        const look = d < 6 && kind !== "goat" && p.gait === 0 ? THREE.MathUtils.clamp(wrapAngle(Math.atan2(px - p.x, pz - p.z) - yaw), -0.9, 0.9) : 0; // cattle and dogs watch a passer-by
        herd.pose(i, p, yaw, look, t); dirty = true;
      }
      if (dirty) herd.flush();
    }

    // Birds: few enough to pose every frame. Crows perch on the cross-arms of the street's own utility poles.
    if (st.polesVer !== streetPoles.version || Math.hypot(px - st.perchAt[0], pz - st.perchAt[1]) > 50) { st.polesVer = streetPoles.version; st.perchAt = [px, pz];
      st.perches = streetPoles.list.map((p, i) => ({ p, i, d: Math.hypot(p.p[0] - px, p.p[1] - pz) })).filter(e => e.d < draw && hash(Math.round(e.p.p[0]), Math.round(e.p.p[1]), 11) < 0.34).sort((a, b) => a.d - b.d).slice(0, q === "low" ? 6 : MAX_CROWS)
        .map(e => { const side = hash(e.i, 3, 12) < 0.5 ? 0.45 : -0.45; return [e.p.p[0] + Math.cos(e.p.rot) * side, 7.64, e.p.p[1] - Math.sin(e.p.rot) * side] as V3; }); }
    let b = 0; const birds = gpu.birds; const perFlock = q === "low" ? 7 : WILDLIFE.max.flock;
    for (const f of st.lists.flocks) { const d = Math.hypot(f.x - px, f.z - pz); const g0 = st.gates.get(f.id) ?? newGate(), g1 = gateStep(g0, d, inFrontOf(px, pz, heading, f.x, f.z), draw); st.gates.set(f.id, g1);
      const n = Math.min(f.count, perFlock); for (let i = 0; i < n && b < birds.max; i++, b++) { if (g1.shown) birds.pose(b, pigeonPose(f, i, t), 1, PIGEON[i % PIGEON.length]); else birds.hide(b); } }
    for (let i = 0; i < st.perches.length && b < birds.max; i++, b++) { const p = st.perches[i]; birds.pose(b, crowPose(p[0], p[1], p[2], i, t), 1.25, CROW); }
    st.kite[0] += (px - st.kite[0]) * (1 - Math.exp(-dt * 0.05)); st.kite[1] += (pz - st.kite[1]) * (1 - Math.exp(-dt * 0.05));
    for (let i = 0; i < (q === "low" ? 2 : MAX_KITES) && b < birds.max; i++, b++) birds.pose(b, kitePose(i, t, st.kite[0], st.kite[1]), 3.2, KITE);
    birds.flush(b);
  });

  return <group name="wildlife">{[...Object.values(gpu.herds).flatMap(h => h.meshes), ...gpu.birds.meshes].map((m, i) => <primitive key={i} object={m} />)}</group>;
}
