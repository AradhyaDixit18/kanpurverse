"use client";
/**
 * Draws groundCover.ts: grass tufts, loose stones and soft earth patches on the open ground near the camera. Three
 * instanced meshes (three draw calls); the field follows the view and fades out in the vertex shader before its edge.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LANDMARKS } from "@kanpurverse/shared";
import { COVER, groundCoverAround } from "./groundCover";
import { distToRoad } from "./propPlacement";
import { roadsNear, getGeo, roadsVersion } from "./roads";
import { useStore } from "../state/store";

/** Three crossed blade cards, base at the origin, normals up so the tuft is lit like the ground it stands on. */
function tuftGeometry() {
  const pos: number[] = [], uv: number[] = [], nor: number[] = [], idx: number[] = []; const w = 0.3, h = 0.46;
  for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3, cx = Math.cos(a) * w, cz = Math.sin(a) * w, o = k * 4;
    pos.push(-cx, 0, -cz, cx, 0, cz, cx, h, cz, -cx, h, -cz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    // both windings, one material side: a double-sided material would flip the normal on back faces and shade half the cards black
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3, o, o + 2, o + 1, o, o + 3, o + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g;
}
/** A fan of tapered blades, lighter toward the tips, on a transparent card. */
function bladeTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d")!; let s = 11; const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let i = 0; i < 26; i++) { const bx = 26 + r() * 204, top = 20 + r() * 150, lean = (r() - 0.5) * 90, half = 5 + r() * 6; const shade = 150 + Math.floor(r() * 70);
    const grad = x.createLinearGradient(0, 256, 0, top); grad.addColorStop(0, `rgb(${Math.floor(shade * 0.62)},${Math.floor(shade * 0.66)},${Math.floor(shade * 0.52)})`); grad.addColorStop(1, `rgb(${shade},${shade},${Math.floor(shade * 0.86)})`);
    x.fillStyle = grad; x.beginPath(); x.moveTo(bx - half, 256); x.quadraticCurveTo(bx - half * 0.5 + lean * 0.35, (256 + top) / 2, bx + lean, top); x.quadraticCurveTo(bx + half * 0.5 + lean * 0.35, (256 + top) / 2, bx + half, 256); x.closePath(); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** Soft, ragged-edged blot for the earth patches. */
function blotTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!; let s = 5; const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = r() * 30, rad = 12 + r() * 22; const px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d; const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, "rgba(255,255,255,0.22)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
  return new THREE.CanvasTexture(c);
}

const GRASS = [new THREE.Color("#8aa848"), new THREE.Color("#a5ad56"), new THREE.Color("#c4b66c")];
const STONES = [new THREE.Color("#8d877c"), new THREE.Color("#a39a88"), new THREE.Color("#7a6a58"), new THREE.Color("#9c5f48")];
const PATCH_GREEN = new THREE.Color("#5c7a36"), PATCH_EARTH = new THREE.Color("#8a6f4d");

export function GroundCover() { const quality = useStore(s => s.settings.quality); return quality === "low" ? null : <Field thin={quality === "medium" ? 2 : 1} />; }

function Field({ thin }: { thin: number }) {
  const tufts = useRef<THREE.InstancedMesh>(null), stones = useRef<THREE.InstancedMesh>(null), patches = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(() => ({ uCoverCentre: { value: new THREE.Vector2(1e6, 1e6) }, uCoverFade: { value: new THREE.Vector2(COVER.fadeFrom, COVER.fadeTo) }, uCoverTime: { value: 0 } }), []);
  const res = useMemo(() => {
    /** Scale every instance to nothing toward the field edge; grass also sways from the tips. */
    const fade = (m: THREE.Material, sway: boolean) => { m.onBeforeCompile = shader => { Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = "uniform vec2 uCoverCentre; uniform vec2 uCoverFade; uniform float uCoverTime;\n" + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec2 coverAt = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
  float coverK = 1.0 - smoothstep(uCoverFade.x, uCoverFade.y, distance(coverAt, uCoverCentre));
  transformed *= coverK;
  ${sway ? "float coverTip = uv.y * uv.y * coverK; transformed.x += sin(uCoverTime * 1.7 + coverAt.x * 0.7 + coverAt.y * 0.9) * 0.05 * coverTip; transformed.z += cos(uCoverTime * 1.3 + coverAt.x * 0.5 - coverAt.y * 0.6) * 0.035 * coverTip;" : ""}
#endif`); }; return m; };
    const blades = bladeTexture(), blot = blotTexture();
    const stone = new THREE.IcosahedronGeometry(1, 0); stone.scale(1, 0.55, 0.8);
    const flat = new THREE.PlaneGeometry(2, 2); flat.rotateX(-Math.PI / 2);
    return { blades, blot, tuft: tuftGeometry(), stone, flat,
      tuftMat: fade(new THREE.MeshLambertMaterial({ map: blades, alphaTest: 0.42 }), true),
      stoneMat: fade(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), false),
      patchMat: fade(new THREE.MeshLambertMaterial({ map: blot, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -0.5, polygonOffsetUnits: -0.5 }), false) };
  }, [uniforms]);
  useEffect(() => () => { res.blades.dispose(); res.blot.dispose(); res.tuft.dispose(); res.stone.dispose(); res.flat.dispose(); res.tuftMat.dispose(); res.stoneMat.dispose(); res.patchMat.dispose(); }, [res]);

  const built = useRef({ x: 1e9, z: 1e9, version: -1, thin: 0 }); const look = useMemo(() => new THREE.Vector3(), []); const m4 = useMemo(() => new THREE.Matrix4(), []); const q = useMemo(() => new THREE.Quaternion(), []); const up = useMemo(() => new THREE.Vector3(0, 1, 0), []); const pos = useMemo(() => new THREE.Vector3(), []); const scl = useMemo(() => new THREE.Vector3(), []); const col = useMemo(() => new THREE.Color(), []);
  useFrame(({ camera, clock }) => {
    // The field sits ahead of the camera, where the ground is actually in view.
    camera.getWorldDirection(look); const flat = Math.hypot(look.x, look.z) || 1; const cx = camera.position.x + (look.x / flat) * 14, cz = camera.position.z + (look.z / flat) * 14;
    uniforms.uCoverCentre.value.set(cx, cz); uniforms.uCoverTime.value = clock.elapsedTime;
    const b = built.current; if (Math.hypot(cx - b.x, cz - b.z) < COVER.rebuildAfter && b.version === roadsVersion() && b.thin === thin) return;
    if (!tufts.current || !stones.current || !patches.current) return;
    built.current = { x: cx, z: cz, version: roadsVersion(), thin };
    const geo = getGeo(); const reach = COVER.radius + 20;
    const water = (geo?.water ?? []).filter(w => w.pts.length >= 4).map(w => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of w.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { pts: w.pts, x0, x1, z0, z1 }; }).filter(w => w.x0 < cx + reach && w.x1 > cx - reach && w.z0 < cz + reach && w.z1 > cz - reach);
    const rails = (geo?.rails ?? []).flatMap(r => r.pts.slice(0, -1).map((a, i) => ({ a, b: r.pts[i + 1], w: 4.2 * r.tracks + 3 }))).filter(s => Math.min(Math.hypot(s.a[0] - cx, s.a[1] - cz), Math.hypot(s.b[0] - cx, s.b[1] - cz)) < reach + 80);
    const lakes = LANDMARKS.filter(l => l.kind === "lake");
    const blocked = (x: number, z: number) => { for (const s of rails) if (distToRoad(x, z, s) < s.w / 2) return true; for (const l of lakes) if (Math.hypot(l.p[0] - x, l.p[1] - z) < l.r + 1) return true;
      for (const w of water) { if (x < w.x0 || x > w.x1 || z < w.z0 || z > w.z1) continue; let inside = false; for (let i = 0, j = w.pts.length - 1; i < w.pts.length; j = i++) { const [xi, zi] = w.pts[i], [xj, zj] = w.pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside; } if (inside) return true; } return false; };
    const cover = groundCoverAround(cx, cz, roadsNear(cx, cz, COVER.radius + 30), blocked, COVER.radius, thin);
    const put = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, c: THREE.Color) => { q.setFromAxisAngle(up, yaw); m4.compose(pos.set(x, y, z), q, scl.set(sx, sy, sz)); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, c); };
    cover.tufts.forEach((t, i) => put(tufts.current!, i, t.x, 0, t.z, t.yaw, t.scale, t.scale * (0.8 + t.dry * 0.25), t.scale, col.copy(GRASS[0]).lerp(GRASS[t.dry < 0.5 ? 1 : 2], t.dry < 0.5 ? t.dry * 2 : t.dry * 2 - 1)));
    cover.stones.forEach((s, i) => put(stones.current!, i, s.x, s.scale * 0.2, s.z, s.yaw, s.scale, s.scale, s.scale, STONES[Math.min(STONES.length - 1, Math.floor(s.tone * STONES.length))]));
    cover.patches.forEach((p, i) => put(patches.current!, i, p.x, 0.02, p.z, p.yaw, p.r, 1, p.r, p.green ? PATCH_GREEN : PATCH_EARTH));
    for (const [mesh, n] of [[tufts.current, cover.tufts.length], [stones.current, cover.stones.length], [patches.current, cover.patches.length]] as const) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
  });
  return <group name="ground-cover">
    <instancedMesh ref={patches} args={[res.flat, res.patchMat, COVER.maxPatches]} frustumCulled={false} renderOrder={1} receiveShadow />
    <instancedMesh ref={stones} args={[res.stone, res.stoneMat, COVER.maxStones]} frustumCulled={false} receiveShadow />
    <instancedMesh ref={tufts} args={[res.tuft, res.tuftMat, COVER.maxTufts]} frustumCulled={false} receiveShadow />
  </group>;
}
