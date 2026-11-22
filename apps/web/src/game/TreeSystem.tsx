"use client";
/**
 * Street and park trees: ten North Indian species with branches, leaf masses, seasonal flowers and hanging fruit (mango,
 * jamun, guava), swaying in the wind. Sites and blueprints come from packages/shared/src/trees.ts (pure, tested).
 *
 * Rendering: trees are bucketed into 96 m chunks; only chunks near the player are built, each as a handful of instanced
 * meshes (trunks, branches, crowns, fruit). Chunks build a couple per frame to avoid hitches and are freed when far.
 * Fruit is drawn only near the player. Wind sway is a small vertex-shader offset, so it costs no CPU per tree.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import type { RigidBody } from "@dimforge/rapier3d-compat";
import { drivenCar, relation, slowCar } from "./vehicleHits";
import { sfx } from "../audio/sfx";
import * as THREE from "three";
import { treeSites, blueprint, seasonFromMonth, SPECIES, type Season, type TreeSite } from "@kanpurverse/shared";
import { foliageGeometry } from "./foliage";
import { useStore, useGraphics } from "../state/store";
import { playerPos } from "./refs";
import { weatherNow } from "./weather";
import type { GeoData } from "./roads";

const CHUNK = 96;
const uniforms = { uTime: { value: 0 }, uWind: { value: 0.3 }, uHit: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, -99, 0)) }, uHitDir: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) } };
let hitSlot = 0;
/** A vehicle struck the tree at (x, z) travelling along (dx, dz): the whole tree leans away and springs back (shader). */
function treeHit(x: number, z: number, dx: number, dz: number, strength: number) { const i = hitSlot++ % 4; uniforms.uHit.value[i].set(x, z, uniforms.uTime.value, strength); uniforms.uHitDir.value[i].set(dx, dz, 0, 0); }
/** Trunks thinner than this (m radius) belong to saplings and small trees: a car bends them and drives on. Thicker trunks are solid. */
const SAPLING_R = 0.16;

function sway(mat: THREE.MeshStandardMaterial, kind: "crown" | "fruit" | "card" | "trunk") {
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = uniforms.uTime; shader.uniforms.uWind = uniforms.uWind; shader.uniforms.uHit = uniforms.uHit; shader.uniforms.uHitDir = uniforms.uHitDir;
    const body = kind === "trunk" ? "" : kind === "crown"
      ? `float hf = clamp(position.y * 0.5 + 0.5, 0.0, 1.0);
         transformed.x += (sin(uTime * 1.25 + ph + position.y * 1.7) + 0.5 * sin(uTime * 2.9 + ph * 1.7 + position.z * 2.3)) * 0.05 * uWind * (0.25 + hf);
         transformed.z += (cos(uTime * 1.05 + ph * 1.3 + position.x * 1.5) + 0.5 * sin(uTime * 2.3 + ph + position.y * 2.1)) * 0.04 * uWind * (0.25 + hf);
         transformed.y += sin(uTime * 3.7 + ph * 2.1 + position.x * 5.0 + position.z * 4.0) * 0.012 * uWind;`
      : kind === "fruit" ? `float sc = max(0.01, length(instanceMatrix[0].xyz));
         transformed.x += sin(uTime * 1.25 + ph) * 0.07 * uWind / sc;
         transformed.z += cos(uTime * 1.05 + ph * 1.3) * 0.06 * uWind / sc;`
      : `float sc = max(0.01, length(instanceMatrix[0].xyz));
         vec3 off = vec3(sin(uTime * 1.25 + ph) * 0.07, 0.0, cos(uTime * 1.05 + ph * 1.3) * 0.06) * uWind;
         off.y += sin(uTime * 5.3 + ph * 3.1 + position.x * 4.0) * 0.025 * uWind; // leaf flutter
         transformed += off / sc;`;
    shader.vertexShader = "uniform float uTime;\nuniform float uWind;\nuniform vec4 uHit[4];\nuniform vec4 uHitDir[4];\n" + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
      #ifdef USE_INSTANCING
      { vec3 ip = instanceMatrix[3].xyz; float wy = (instanceMatrix * vec4(position, 1.0)).y; vec2 bw = vec2(0.0);
        for (int i = 0; i < 4; i++) { vec4 h = uHit[i]; float e = uTime - h.z; float d = distance(ip.xz, h.xy);
          if (e > 0.0 && e < 3.0 && d < 3.5) bw += uHitDir[i].xy * h.w * exp(-e * 1.6) * cos(e * 7.0) * (1.0 - d / 3.5); }
        if (dot(bw, bw) > 0.0) { mvPosition.xyz += (viewMatrix * vec4(bw.x * wy * 0.22, 0.0, bw.y * wy * 0.22, 0.0)).xyz; gl_Position = projectionMatrix * mvPosition; } }
      #endif`).replace("#include <begin_vertex>", `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
      #else
        float ph = 0.0;
      #endif
      ${body}`);
  };
  mat.customProgramCacheKey = () => "tree-sway-" + kind;
  return mat;
}

/** A cluster of leaves on a transparent background, drawn once on a canvas. Leaves are near-white so each card's instance
 *  colour sets the species' green; the darker veins and edges give the cluster depth. */
function leafTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!; let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 95; i++) {
    const cx = 128 + (r() - 0.5) * 200 * Math.sqrt(r()), cy = 128 + (r() - 0.5) * 200 * Math.sqrt(r()), a = r() * Math.PI * 2, len = 22 + r() * 20, w = len * (0.32 + r() * 0.12), l = Math.round(150 + r() * 105);
    x.save(); x.translate(cx, cy); x.rotate(a); x.beginPath(); x.moveTo(-len / 2, 0); x.quadraticCurveTo(0, -w, len / 2, 0); x.quadraticCurveTo(0, w, -len / 2, 0); x.closePath();
    x.fillStyle = `rgb(${l},${l},${l})`; x.fill(); x.strokeStyle = `rgba(40,40,40,0.35)`; x.lineWidth = 1.2; x.stroke(); x.beginPath(); x.moveTo(-len / 2, 0); x.lineTo(len / 2, 0); x.stroke(); x.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let shared: { trunk: THREE.BufferGeometry; crown: THREE.BufferGeometry; card: THREE.BufferGeometry; fruit: THREE.BufferGeometry; bark: THREE.MeshStandardMaterial; leaves: THREE.MeshStandardMaterial; cards: THREE.MeshStandardMaterial; fruitMat: THREE.MeshStandardMaterial } | null = null;
function res() {
  if (shared) return shared;
  const trunk = new THREE.CylinderGeometry(0.7, 1, 1, 7, 1); trunk.translate(0, 0.5, 0);
  const fruit = new THREE.SphereGeometry(0.5, 8, 6);
  shared = {
    trunk, crown: foliageGeometry(2), fruit, card: new THREE.PlaneGeometry(1, 1),
    bark: sway(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), "trunk"),
    leaves: sway(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95 }), "crown"),
    cards: sway(new THREE.MeshStandardMaterial({ color: 0xffffff, map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 }), "card"),
    fruitMat: sway(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42 }), "fruit"),
  };
  return shared;
}

interface Trunk { key: string; x: number; z: number; r: number; h: number; small: boolean }
interface Chunk { group: THREE.Group; fruit: THREE.InstancedMesh | null; cx: number; cz: number; trunks: Trunk[] }
const _o = new THREE.Object3D(), _c = new THREE.Color(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();

function buildChunk(sites: TreeSite[], season: Season, opts: { shadows: boolean; branches: boolean; fruit: boolean }): Chunk {
  const r = res(); const bps = sites.map(s => ({ s, b: blueprint(s.species, s.seed, season, s.scale) }));
  const nTrunk = bps.reduce((n, x) => n + 1 + (opts.branches ? x.b.branches.length + x.b.roots.length : 0), 0);
  const cardsPer = (r0: number) => Math.round(9 + 9 * r0 * r0);
  const nCard = bps.reduce((n, x) => n + x.b.blobs.reduce((m, bl) => m + cardsPer(bl.s[0]), 0), 0);
  const nCrown = bps.reduce((n, x) => n + x.b.blobs.length, 0), nFruit = opts.fruit ? bps.reduce((n, x) => n + x.b.fruit.length, 0) : 0;
  const trunks = new THREE.InstancedMesh(r.trunk, r.bark, Math.max(1, nTrunk)), crowns = new THREE.InstancedMesh(r.crown, r.leaves, Math.max(1, nCrown));
  const fruit = nFruit ? new THREE.InstancedMesh(r.fruit, r.fruitMat, nFruit) : null;
  const cards = new THREE.InstancedMesh(r.card, r.cards, Math.max(1, nCard));
  let ti = 0, ci = 0, fi = 0, ki = 0; const cr = (k: number) => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); };
  for (const { s, b } of bps) {
    const yaw = (s.seed % 6283) / 1000, cy = Math.cos(yaw), sy = Math.sin(yaw);
    const W = (p: [number, number, number]) => new THREE.Vector3(s.x + p[0] * cy + p[2] * sy, p[1], s.z - p[0] * sy + p[2] * cy);
    _o.position.set(s.x, 0, s.z); _o.quaternion.identity(); _o.scale.set(b.trunk.r, b.trunk.h, b.trunk.r); _o.updateMatrix(); trunks.setMatrixAt(ti, _o.matrix); trunks.setColorAt(ti++, _c.set(b.trunk.color));
    if (opts.branches) {
      for (const br of b.branches) { const a = W(br.from), e = W(br.to); _d.subVectors(e, a); const len = _d.length(); _o.position.copy(a); _o.quaternion.setFromUnitVectors(_up, _d.normalize()); _o.scale.set(br.r, len, br.r); _o.updateMatrix(); trunks.setMatrixAt(ti, _o.matrix); trunks.setColorAt(ti++, _c.set(b.trunk.color).multiplyScalar(0.9)); }
      for (const rt of b.roots) { const a = W(rt.p); _o.position.copy(a); _o.quaternion.identity(); _o.scale.set(rt.r, rt.h, rt.r); _o.updateMatrix(); trunks.setMatrixAt(ti, _o.matrix); trunks.setColorAt(ti++, _c.set(b.trunk.color).multiplyScalar(0.85)); }
    }
    const greens = SPECIES[b.species].greens;
    b.blobs.forEach((bl, bi) => {
      // Inner core: a smaller, darker mass that fills the gaps between leaf cards (the shaded inside of a canopy).
      const centre = W(bl.p); _o.position.copy(centre); _o.quaternion.setFromAxisAngle(_up, yaw + bl.p[0]); _o.scale.set(bl.s[0] * 0.78, bl.s[1] * 0.78, bl.s[2] * 0.78); _o.updateMatrix(); crowns.setMatrixAt(ci, _o.matrix);
      const flower = !greens.some(gc => gc === bl.color) && !/^#[2-8]/.test(bl.color) ? bl.color : null; const leafCol = flower ? greens[bi % greens.length] : bl.color;
      crowns.setColorAt(ci++, _c.set(leafCol).multiplyScalar(0.62));
      // Leaf clusters: alpha-cut cards scattered through the outer shell of the mass, lighter on top, darker underneath.
      const n = cardsPer(bl.s[0]); for (let k = 0; k < n; k++) {
        const q = s.seed * 0.001 + bi * 97 + k * 13.7, th = cr(q) * Math.PI * 2, u = cr(q + 1) * 2 - 1, rad = 0.62 + 0.42 * Math.pow(cr(q + 2), 0.5), st = Math.sqrt(1 - u * u);
        const lx = Math.cos(th) * st * bl.s[0] * rad, ly = u * bl.s[1] * rad, lz = Math.sin(th) * st * bl.s[2] * rad;
        _o.position.set(centre.x + lx, centre.y + ly, centre.z + lz); _o.rotation.set(cr(q + 3) * Math.PI, cr(q + 4) * Math.PI * 2, cr(q + 5) * Math.PI); const sz = (0.9 + cr(q + 6) * 0.7) * Math.max(0.8, bl.s[0] * 0.6); _o.scale.set(sz, sz, sz); _o.updateMatrix(); cards.setMatrixAt(ki, _o.matrix);
        const light = 0.78 + 0.32 * (u * 0.5 + 0.5) + (cr(q + 7) - 0.5) * 0.14; const bloom = flower && cr(q + 8) < 0.62;
        cards.setColorAt(ki++, _c.set(bloom ? flower! : leafCol).multiplyScalar(bloom ? 0.95 + 0.1 * u : light));
      }
    });
    if (fruit) for (const f of b.fruit) { const elong = b.species === "mango" ? 1.55 : b.species === "jamun" ? 1.3 : 1.05; _o.position.copy(W(f.p)); _o.quaternion.setFromAxisAngle(_d.set(1, 0, 1).normalize(), (f.stage - 0.5) * 0.5); _o.scale.set(f.size / elong, f.size, f.size / elong); _o.updateMatrix(); fruit.setMatrixAt(fi, _o.matrix); fruit.setColorAt(fi++, _c.set(f.color)); }
  }
  const group = new THREE.Group(); group.name = "tree-chunk";
  for (const [m, n] of [[trunks, ti], [crowns, ci], [cards, ki], [fruit, fi]] as const) { if (!m) continue; m.count = n; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.castShadow = opts.shadows && m !== fruit; m.receiveShadow = true; group.add(m); }
  const cx = sites.reduce((a, s) => a + s.x, 0) / Math.max(1, sites.length), cz = sites.reduce((a, s) => a + s.z, 0) / Math.max(1, sites.length);
  const trunkList: Trunk[] = bps.map(({ s, b }) => ({ key: `${s.x},${s.z}`, x: s.x, z: s.z, r: b.trunk.r, h: b.trunk.h, small: b.trunk.r < SAPLING_R }));
  return { group, fruit, cx, cz, trunks: trunkList };
}

export function TreeSystem({ geo, avoid }: { geo: GeoData; avoid: { x: number; z: number; r: number }[] }) {
  const g = useGraphics(); const seasonSetting = useStore(s => s.settings.season);
  const season: Season = seasonSetting === "auto" ? seasonFromMonth(new Date().getMonth()) : seasonSetting ?? "monsoon";
  const sites = useMemo(() => treeSites({ roads: geo.roads, buildings: geo.buildings, rails: geo.rails, water: geo.water, parks: geo.parks, avoid }, 1), [geo, avoid]);
  const buckets = useMemo(() => { const m = new Map<string, TreeSite[]>(); for (const s of sites) { const k = `${Math.floor(s.x / CHUNK)},${Math.floor(s.z / CHUNK)}`; (m.get(k) ?? m.set(k, []).get(k)!).push(s); } return m; }, [sites]);
  const { world, rapier } = useRapier(); const bodies = useRef(new Map<string, RigidBody>()); const lastHit = useRef(new Map<string, number>());
  const root = useRef<THREE.Group>(null); const chunks = useRef(new Map<string, Chunk>()); const st = useRef({ at: 0, x: Infinity, z: Infinity, key: "" });
  const radius = Math.min(320, Math.max(110, g.viewDistance * 0.42)); const fruitR = g.effects === "low" ? 0 : g.effects === "medium" ? 70 : 95;
  const opts = useMemo(() => ({ shadows: g.shadows !== "off", branches: g.effects !== "low", fruit: g.effects !== "low" }), [g.shadows, g.effects]);
  const cfgKey = `${season}:${opts.shadows}:${opts.branches}:${opts.fruit}`;
  const clear = () => { for (const c of chunks.current.values()) { root.current?.remove(c.group); c.group.children.forEach(m => (m as THREE.InstancedMesh).dispose()); } chunks.current.clear(); };
  useEffect(() => () => { clear(); for (const b of bodies.current.values()) world.removeRigidBody(b); bodies.current.clear(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }) => {
    const t = clock.elapsedTime; uniforms.uTime.value = t; uniforms.uWind.value = weatherNow.wind * (0.8 + 0.35 * Math.sin(t * 0.37) * Math.sin(t * 0.11 + 1.3)); // gusts
    const s = st.current, grp = root.current; if (!grp) return;
    // Contact with the player's vehicle: saplings bend and the car drives on a little slower; solid trunks also shake (the
    // Rapier collider below stops the car and Vehicles.tsx registers the crash).
    const car = drivenCar();
    if (car && Math.abs(car.speed) > 1.2) {
      const fx = Math.sin(car.yaw) * Math.sign(car.speed), fz = Math.cos(car.yaw) * Math.sign(car.speed), ccx = Math.floor(car.x / CHUNK), ccz = Math.floor(car.z / CHUNK);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const c = chunks.current.get(`${ccx + dx},${ccz + dz}`); if (!c) continue;
        for (const tr of c.trunks) { if (Math.abs(tr.x - car.x) > 6 || Math.abs(tr.z - car.z) > 6) continue; if (!relation(tr.x, tr.z, car, tr.r + 0.05).hit) continue;
          const last = lastHit.current.get(tr.key) ?? -9; if (t - last < 1.2) continue; lastHit.current.set(tr.key, t);
          if (tr.small) { treeHit(tr.x, tr.z, fx, fz, Math.min(1.6, 0.6 + Math.abs(car.speed) * 0.08)); slowCar(0.9); sfx.crash(0.12); } else treeHit(tr.x, tr.z, fx, fz, 0.16); } }
    }
    if (s.key !== cfgKey) { clear(); s.key = cfgKey; s.x = Infinity; }
    const moved = Math.hypot(playerPos.x - s.x, playerPos.z - s.z) > 12; if (!moved && t - s.at < 0.5) return;
    if (moved) { s.x = playerPos.x; s.z = playerPos.z; } s.at = t;
    const px = playerPos.x, pz = playerPos.z, r = Math.ceil(radius / CHUNK) + 1; const want: { k: string; d: number }[] = [];
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { const cx = Math.floor(px / CHUNK) + dx, cz = Math.floor(pz / CHUNK) + dz, k = `${cx},${cz}`; if (!buckets.has(k)) continue; const d = Math.hypot((cx + 0.5) * CHUNK - px, (cz + 0.5) * CHUNK - pz); if (d < radius + CHUNK * 0.71) want.push({ k, d }); }
    const keep = new Set(want.map(w => w.k));
    for (const [k, c] of chunks.current) if (!keep.has(k)) { grp.remove(c.group); c.group.children.forEach(m => (m as THREE.InstancedMesh).dispose()); chunks.current.delete(k); }
    let built = 0; for (const w of want.sort((a, b) => a.d - b.d)) { if (chunks.current.has(w.k)) continue; if (built++ >= 2) break; const c = buildChunk(buckets.get(w.k)!, season, opts); chunks.current.set(w.k, c); grp.add(c.group); }
    for (const c of chunks.current.values()) if (c.fruit) c.fruit.visible = Math.hypot(c.cx - px, c.cz - pz) < fruitR + CHUNK * 0.5;
    // Solid trunks near the player get fixed Rapier cylinders (vehicles and people stop against them); far ones are freed.
    const need = new Set<string>();
    for (const c of chunks.current.values()) { if (Math.hypot(c.cx - px, c.cz - pz) > 60 + CHUNK) continue; for (const tr of c.trunks) { if (tr.small || Math.hypot(tr.x - px, tr.z - pz) > 55) continue; need.add(tr.key);
      if (!bodies.current.has(tr.key)) { const b = world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(tr.x, tr.h / 2, tr.z)); world.createCollider(rapier.ColliderDesc.cylinder(tr.h / 2, tr.r * 1.05).setFriction(0.6), b); bodies.current.set(tr.key, b); } } }
    for (const [k, b] of bodies.current) if (!need.has(k)) { world.removeRigidBody(b); bodies.current.delete(k); }
  });
  return <group ref={root} name="trees" />;
}
