/**
 * Ground cover near the camera: grass tufts that gather in clumps, loose stones, and soft patches of greener or barer
 * earth on the open ground between roads. Pure and deterministic (tests/groundCover.test.ts): a cell of the world always
 * grows the same tuft, so cover does not shuffle when the field is rebuilt around a new centre.
 */
import { kerbDistance, clearOfReserved, type RoadLike } from "./propPlacement";

export const COVER = {
  /** Grid pitch (m) of tuft cells and of patch cells. */
  cell: 1.05, patchCell: 8,
  /** Field radius (m) around the rebuild centre; the shader fades cover out between `fadeFrom` and `fadeTo` of the live centre. */
  radius: 46, fadeFrom: 23, fadeTo: 33,
  /** Rebuild when the live centre has moved this far. fadeTo + rebuildAfter must stay inside radius. */
  rebuildAfter: 12,
  /** Paved strip beside every carriageway that stays bare (m from the kerb). */
  pavement: 2.5,
  maxTufts: 3600, maxStones: 420, maxPatches: 150,
} as const;

const hash2 = (x: number, z: number, k = 0) => { const s = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
/** Smooth value noise in 0..1 with features about `size` metres across. */
export function valueNoise(x: number, z: number, size: number) {
  const fx = x / size, fz = z / size; const ix = Math.floor(fx), iz = Math.floor(fz); const tx = fx - ix, tz = fz - iz;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = hash2(ix, iz, 9), b = hash2(ix + 1, iz, 9), c = hash2(ix, iz + 1, 9), d = hash2(ix + 1, iz + 1, 9);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
/** 0..1: how readily grass grows at a point. Low frequency, so tufts gather in clumps with bare earth between. */
export function growth(x: number, z: number) { return 0.65 * valueNoise(x, z, 17) + 0.35 * valueNoise(x + 91, z - 37, 5.5); }

export interface Tuft { x: number; z: number; scale: number; yaw: number; dry: number }
export interface Stone { x: number; z: number; scale: number; yaw: number; tone: number }
export interface Patch { x: number; z: number; r: number; yaw: number; green: boolean }
export interface GroundCover { tufts: Tuft[]; stones: Stone[]; patches: Patch[] }

/**
 * Cover within `radius` of (cx, cz). `roads` are the carriageways near the centre; `blocked` vetoes points on water,
 * rails or platforms. `thin` keeps every nth tuft cell (Medium preset).
 */
export function groundCoverAround(cx: number, cz: number, roads: readonly RoadLike[], blocked?: (x: number, z: number) => boolean, radius: number = COVER.radius, thin = 1): GroundCover {
  const tufts: Tuft[] = [], stones: Stone[] = [], patches: Patch[] = []; const c = COVER.cell, r2 = radius * radius;
  for (let ix = Math.floor((cx - radius) / c); ix <= Math.floor((cx + radius) / c); ix++) for (let iz = Math.floor((cz - radius) / c); iz <= Math.floor((cz + radius) / c); iz++) {
    const x = (ix + 0.15 + hash2(ix, iz, 1) * 0.7) * c, z = (iz + 0.15 + hash2(ix, iz, 2) * 0.7) * c;
    if ((x - cx) * (x - cx) + (z - cz) * (z - cz) > r2) continue;
    const stone = hash2(ix, iz, 5) < 0.045; const g = growth(x, z); const grows = hash2(ix, iz, 3) < (g - 0.3) * 2.1 && (thin <= 1 || hash2(ix, iz, 6) < 1 / thin);
    if (!stone && !grows) continue;
    const kerb = kerbDistance(x, z, roads);
    if (kerb < 0.5 || !clearOfReserved(x, z, 0.4) || blocked?.(x, z)) continue;
    if (stone && stones.length < COVER.maxStones) stones.push({ x, z, scale: 0.05 + hash2(ix, iz, 7) * hash2(ix, iz, 8) * 0.2, yaw: hash2(ix, iz, 10) * Math.PI * 2, tone: hash2(ix, iz, 11) });
    if (grows && kerb >= COVER.pavement && tufts.length < COVER.maxTufts) tufts.push({ x, z, scale: (0.55 + hash2(ix, iz, 4) * 0.85) * (0.6 + g * 0.7), yaw: hash2(ix, iz, 12) * Math.PI, dry: Math.min(1, Math.max(0, hash2(ix, iz, 13) * 0.7 + (0.62 - g) * 0.9)) });
  }
  const pc = COVER.patchCell;
  for (let ix = Math.floor((cx - radius) / pc); ix <= Math.floor((cx + radius) / pc); ix++) for (let iz = Math.floor((cz - radius) / pc); iz <= Math.floor((cz + radius) / pc); iz++) {
    if (hash2(ix, iz, 20) < 0.25 || patches.length >= COVER.maxPatches) continue;
    const x = (ix + 0.2 + hash2(ix, iz, 21) * 0.6) * pc, z = (iz + 0.2 + hash2(ix, iz, 22) * 0.6) * pc; const r = 2 + hash2(ix, iz, 23) * 3.2;
    if ((x - cx) * (x - cx) + (z - cz) * (z - cz) > r2) continue;
    if (kerbDistance(x, z, roads) < COVER.pavement + r * 0.85 || !clearOfReserved(x, z, r) || blocked?.(x, z)) continue;
    patches.push({ x, z, r, yaw: hash2(ix, iz, 24) * Math.PI * 2, green: growth(x, z) > 0.47 });
  }
  return { tufts, stones, patches };
}
