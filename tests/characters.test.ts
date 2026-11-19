import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { clipFor, CLIP_SPEED, CHARACTER_FILES, drapeFill, chestOutline, hangStraight, HANG_MAX, shell, garmentSurface } from "../apps/web/src/game/HumanAvatar";

/** Read the JSON chunk of a .glb without a DOM. */
function glbJson(path: string) { const b = readFileSync(new URL(`../apps/web/public${path}`, import.meta.url)); const len = b.readUInt32LE(12); return JSON.parse(b.subarray(20, 20 + len).toString("utf8")); }

describe("rigged character assets", () => {
  const anims = glbJson(CHARACTER_FILES.anims); const female = glbJson(CHARACTER_FILES.female); const male = glbJson(CHARACTER_FILES.male); const hair = glbJson(CHARACTER_FILES.hair);
  it("bodies and hair share the 65-joint humanoid skeleton the animations target", () => {
    const names = (j: { nodes: { name: string }[]; skins: { joints: number[] }[] }) => j.skins[0].joints.map(i => j.nodes[i].name);
    const ref = names(female); expect(ref.length).toBe(65); expect(names(male)).toEqual(ref); expect(names(hair)).toEqual(ref);
    const animated = new Set(anims.animations.flatMap((a: { channels: { target: { node: number } }[] }) => a.channels.map(c => anims.nodes[c.target.node].name)));
    for (const bone of ["pelvis", "spine_02", "Head", "thigh_l", "calf_r", "foot_l", "upperarm_r", "hand_l"]) expect(animated.has(bone)).toBe(true);
  });
  it("every gameplay state maps to a clip that ships in the animation file", () => {
    const clips = new Set(anims.animations.map((a: { name: string }) => a.name));
    for (const s of ["idle", "walk", "run", "sprint", "jump", "fall", "sit", "drive", "wave", "dance", "laugh", "celebrate", "talk", "highfive", "punch", "packet", "openpacket", "consume", "spit"] as const) expect(clips.has(clipFor(s).clip), s).toBe(true);
  });
  it("locomotion playback speed matches ground speed so feet do not slide", () => {
    for (const v of [1.0, 1.4, 3.2, 5.5, 8.5]) { const c = clipFor("walk", v); expect(CLIP_SPEED[c.clip] * c.timeScale).toBeCloseTo(v, 5); }
    expect(clipFor("walk", 1.2).clip).toBe("Walk_Loop"); expect(clipFor("run", 5.5).clip).toBe("Jog_Fwd_Loop"); expect(clipFor("sprint", 8.5).clip).toBe("Sprint_Loop");
  });
  it("hair file carries the styles the game selects, and the payload stays bounded", () => {
    const meshes = new Set(hair.nodes.filter((n: { mesh?: number }) => n.mesh !== undefined).map((n: { name: string }) => n.name));
    for (const h of ["Hair_Long", "Hair_Buns", "Hair_SimpleParted", "Hair_Buzzed", "Hair_Beard"]) expect(meshes.has(h)).toBe(true);
    const total = Object.values(CHARACTER_FILES).reduce((n, f) => n + readFileSync(new URL(`../apps/web/public${f}`, import.meta.url)).length, 0);
    expect(total).toBeLessThan(8 * 1024 * 1024);
  });
});

describe("cloth drape", () => {
  // A flat sheet facing up with a groove at x = 0.3 and a ridge at x = 0.7, like the hollow and the swell of a muscle.
  const N = 21; const pos: number[] = [], nor: number[] = [], tris: number[] = []; const bump = (x: number, at: number) => Math.exp(-(((x - at) / 0.06) ** 2));
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = i / (N - 1), z = j / (N - 1); pos.push(x, -0.03 * bump(x, 0.3) + 0.03 * bump(x, 0.7), z); nor.push(0, 1, 0); }
  for (let i = 0; i + 1 < N; i++) for (let j = 0; j + 1 < N; j++) { const a = i * N + j, b = a + N; tris.push(a, b, a + 1, b, b + 1, a + 1); }
  // a duplicate of one groove vertex, as at a UV seam, used by one extra triangle
  const groove = 6 * N + 10, ridge = 14 * N + 10, flat = 10 * N + 10; const dup = pos.length / 3; pos.push(pos[groove * 3], pos[groove * 3 + 1], pos[groove * 3 + 2]); nor.push(0, 1, 0); tris.push(dup, groove + N, groove + 1);
  const P = new THREE.Float32BufferAttribute(pos, 3), Nn = new THREE.Float32BufferAttribute(nor, 3);
  it("bridges hollows and never cuts into the figure", () => {
    const { fill, weld } = drapeFill(P, Nn, tris, 10, 0.035);
    expect(fill[groove]).toBeGreaterThan(0.008); expect(fill[groove]).toBeLessThanOrEqual(0.03 + 1e-6); expect(fill[ridge]).toBe(0);
    // the sheet tents a few millimetres from the ridge toward the flat, and lies flat well away from both
    expect(fill[flat]).toBeLessThan(0.006); expect(fill[10]).toBeLessThan(0.0005);
    // a longer settle spans the hollow more fully
    expect(drapeFill(P, Nn, tris, 60, 0.035).fill[groove]).toBeGreaterThan(fill[groove]);
    // with no ridge to tent it, the sheet over a lone hollow never rises above the level of its rims
    const lone = pos.map((v, i) => (i % 3 === 1 ? Math.min(v, 0) : v)); const settled = drapeFill(new THREE.Float32BufferAttribute(lone, 3), Nn, tris, 200, 0.035).fill[groove];
    expect(settled).toBeGreaterThan(0.02); expect(settled).toBeLessThanOrEqual(0.03 + 1e-6);
    for (const f of fill) { expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThanOrEqual(0.035); }
    expect(weld[dup]).toBe(groove); expect(weld[groove]).toBe(groove);
  });
  it("is capped, and does nothing with no smoothing", () => {
    expect(drapeFill(P, Nn, tris, 10, 0.004).fill[groove]).toBeCloseTo(0.004, 9);
    expect(Math.max(...drapeFill(P, Nn, tris, 0, 0.035).fill)).toBe(0);
  });
});

describe("a shirt hangs from the chest", () => {
  // An hourglass torso about an axis at z = -0.01: 15 cm at the chest (y = 1.3), drawn in to 11 cm at the waist (y = 1.1), back out to 14 cm at the hip (y = 0.95).
  const radius = (y: number) => (y >= 1.1 ? 0.11 + 0.04 * ((y - 1.1) / 0.2) : 0.11 + 0.03 * ((1.1 - y) / 0.15)); const ring = 48; const pts: number[] = [];
  for (let y = 0.9; y <= 1.4001; y += 0.02) for (let k = 0; k < ring; k++) { const a = (k / ring) * Math.PI * 2; pts.push(Math.sin(a) * radius(y), y, -0.01 + Math.cos(a) * radius(y)); }
  const count = pts.length / 3; const rAt = (arr: ArrayLike<number>, v: number) => Math.hypot(arr[v * 3], arr[v * 3 + 2] + 0.01);
  it("reads the chest outline in every direction", () => {
    const o = chestOutline(pts, count, 1.3, 0.2); expect(o.axisZ).toBeCloseTo(-0.01, 2);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; const r = o.at(Math.sin(a) * 0.1, -0.01 + Math.cos(a) * 0.1); expect(r).toBeGreaterThan(0.148); expect(r).toBeLessThan(0.162); }
  });
  it("carries the waist out to the chest line and pulls nothing in", () => {
    const arr = new Float32Array(pts); hangStraight(arr, count, 1.3, 0.92, 0.2);
    for (let v = 0; v < count; v++) { const y = pts[v * 3 + 1]; const before = rAt(pts, v), after = rAt(arr, v);
      expect(after).toBeGreaterThanOrEqual(before - 1e-6); expect(arr[v * 3 + 1]).toBe(Math.fround(y));
      if (y > 1.3 || y < 0.92) expect(after).toBeCloseTo(before, 6); // above the chest and below the hem: untouched
      if (y > 1.0 && y < 1.14) { expect(after).toBeGreaterThan(0.14); expect(after).toBeLessThan(0.162); } } // the waist no longer shows
  });
  it("releases toward the armholes", () => {
    const arr = new Float32Array(pts); hangStraight(arr, count, 1.3, 0.92, 0.2, () => 0.2); for (let v = 0; v < count; v++) expect(rAt(arr, v)).toBeCloseTo(rAt(pts, v), 6);
  });
  it("on the real bodies, moves the waist by centimetres and nothing by more than the limit", () => {
    for (const [file, chest, hip] of [[CHARACTER_FILES.male, 1.311, 0.971], [CHARACTER_FILES.female, 1.27, 0.93]] as const) {
      const b = readFileSync(new URL(`../apps/web/public${file}`, import.meta.url)); const len = b.readUInt32LE(12); const j = JSON.parse(b.subarray(20, 20 + len).toString("utf8")); const bin0 = 20 + len + 8;
      let acc: { count: number; bufferView: number; byteOffset?: number } | null = null; for (const m of j.meshes) { const a = j.accessors[m.primitives[0].attributes.POSITION]; if (!acc || a.count > acc.count) acc = a; }
      const bv = j.bufferViews[acc!.bufferView]; const off = bin0 + (bv.byteOffset ?? 0) + (acc!.byteOffset ?? 0), stride = bv.byteStride ?? 12, n = acc!.count; const P = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = b.readFloatLE(off + i * stride + k * 4);
      const A = P.slice(); hangStraight(A, n, chest + 0.02, hip - 0.065, 0.2); let max = 0, moved = 0, waist = 0, waistN = 0;
      for (let i = 0; i < n; i++) { const d = Math.hypot(A[i * 3] - P[i * 3], A[i * 3 + 2] - P[i * 3 + 2]); expect(A[i * 3 + 1]).toBe(P[i * 3 + 1]); if (d > 0) { moved++; max = Math.max(max, d); if (Math.abs(P[i * 3 + 1] - (chest + hip) / 2) < 0.06) { waist += d; waistN++; } } }
      expect(moved).toBeGreaterThan(200); expect(max).toBeLessThanOrEqual(HANG_MAX + 1e-6); expect(waist / waistN).toBeGreaterThan(0.008); expect(waist / waistN).toBeLessThan(0.05);
    }
  });
});

describe("garment shells on interleaved body data", () => {
  // The shipped bodies store position, normal, uv, joints and weights in one interleaved buffer (stride 56 bytes).
  // A shell that edits the raw array as if it were xyz triples corrupts every other attribute; this builds the same layout.
  const ring = 24, rows = 26, count = ring * rows, stride = 16; const data = new Float32Array(count * stride); const radius = (y: number) => (y >= 1.1 ? 0.11 + 0.04 * ((y - 1.1) / 0.2) : 0.11 + 0.03 * ((1.1 - y) / 0.15));
  for (let j = 0; j < rows; j++) for (let k = 0; k < ring; k++) { const v = j * ring + k, y = 0.9 + j * 0.02, a = (k / ring) * Math.PI * 2, r = radius(Math.min(y, 1.3));
    data.set([Math.sin(a) * r, y, Math.cos(a) * r, Math.sin(a), 0, Math.cos(a), k / ring, j / rows, 0, 0, 0, 0, 1, 0, 0, 0], v * stride); }
  const index: number[] = []; for (let j = 0; j + 1 < rows; j++) for (let k = 0; k < ring; k++) { const a = j * ring + k, b = j * ring + ((k + 1) % ring), c = a + ring, d = b + ring; index.push(a, b, c, b, d, c); }
  const make = () => { const buf = new THREE.InterleavedBuffer(data.slice(), stride); const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.InterleavedBufferAttribute(buf, 3, 0)); g.setAttribute("normal", new THREE.InterleavedBufferAttribute(buf, 3, 3)); g.setAttribute("uv", new THREE.InterleavedBufferAttribute(buf, 2, 6));
    g.setAttribute("skinIndex", new THREE.InterleavedBufferAttribute(buf, 4, 8)); g.setAttribute("skinWeight", new THREE.InterleavedBufferAttribute(buf, 4, 12)); g.setIndex(index); return g; };
  const bones = [{ name: "spine_03" }];
  it("moves positions only: weights, joints and uv survive, nothing is pulled in or flung out", () => {
    const src = make(); const g = shell("test:shirt", src, bones, ["spine_03"], 0.012, undefined, { drape: 12, slack: 0.03, hang: { top: 1.32, bottom: 0.94, halfWidth: 0.2 } });
    const p = g.getAttribute("position"), w = g.getAttribute("skinWeight"), si = g.getAttribute("skinIndex"), uv = g.getAttribute("uv"), sp = src.getAttribute("position"); expect(p.count).toBe(count);
    for (let v = 0; v < count; v++) { expect([w.getX(v), w.getY(v), w.getZ(v), w.getW(v)]).toEqual([1, 0, 0, 0]); expect([si.getX(v), si.getY(v)]).toEqual([0, 0]); expect(uv.getX(v)).toBeCloseTo((v % ring) / ring, 6);
      const before = Math.hypot(sp.getX(v), sp.getZ(v)), after = Math.hypot(p.getX(v), p.getZ(v)); expect(Number.isFinite(after)).toBe(true); expect(after).toBeGreaterThanOrEqual(before + 0.011); expect(after).toBeLessThan(before + 0.012 + 0.03 + HANG_MAX + 1e-6); expect(p.getY(v)).toBeCloseTo(sp.getY(v), 6); }
    // the waist ring is carried out toward the chest line; the source geometry is untouched
    const waist = 10 * ring; expect(Math.hypot(p.getX(waist), p.getZ(waist))).toBeGreaterThan(0.14); expect(Math.hypot(sp.getX(waist), sp.getZ(waist))).toBeCloseTo(0.11, 5);
    const n = g.getAttribute("normal"); for (let v = 0; v < count; v++) expect(Math.hypot(n.getX(v), n.getY(v), n.getZ(v))).toBeCloseTo(1, 4);
  });
  it("a belt worn over the shirt rides on the shirt, a fixed distance outside it", () => {
    const src = make(); const shirt = garmentSurface("test:shirt")!; expect(shirt.pos.length).toBe(count * 3);
    const belt = shell("test:belt", src, bones, ["spine_03"], 0.01, (_, q) => q.y > 0.99 && q.y < 1.05, { under: shirt }); const p = belt.getAttribute("position"); expect(belt.getIndex()!.count).toBeGreaterThan(0);
    for (let v = 0; v < count; v++) { const over = Math.hypot(p.getX(v), p.getZ(v)) - Math.hypot(shirt.pos[v * 3], shirt.pos[v * 3 + 2]); expect(over).toBeGreaterThan(0.0099); expect(over).toBeLessThan(0.0101); }
  });
});
