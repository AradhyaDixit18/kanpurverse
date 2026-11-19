/**
 * Street wildlife: where animals live and how they move. Pure, deterministic and unit-tested (tests/wildlife.test.ts);
 * Animals.tsx only draws what this file decides.
 *
 * Rules the placement enforces:
 *  - cattle stand, amble and sit on the verge, never in a lane; beside a fast road they keep at least 6 m back
 *  - street dogs trot and rest along one footpath and never cross a carriageway
 *  - goats graze in small herds beside quiet residential and service lanes only
 *  - pigeons feed on open ground off the road; a third stay down while the rest rise and circle
 *  - nothing appears directly in front of the player at close range (see `gateStep`)
 *  - animals are drawn only inside a quality-linked range and animated only inside a shorter one
 *
 * Time is real seconds from a local clock. The old Animals.tsx used the world clock, so with a fixed atmosphere (day,
 * sunset or night) every animal froze, and in the day/night cycle they ran at the cycle's accelerated rate.
 */
import { kerbDistance, clearOfCarriageways, clearOfParkedVehicles, clearOfStandingPeople, clearOfReserved, distToRoad, type RoadLike } from "./propPlacement";

export interface WRoad extends RoadLike { cls?: string; len: number; dx: number; dz: number; nx: number; nz: number }
export type RoadQuery = (x: number, z: number, r: number) => WRoad[];
export type WildQuality = "low" | "medium" | "high" | "ultra";

export const WILDLIFE = {
  cell: 96,
  /** Roads treated as fast traffic. */
  fast: new Set(["motorway", "trunk", "primary", "secondary"]),
  /** Roads quiet enough for goats. */
  quiet: new Set(["residential", "service", "living_street", "unclassified"]),
  /** Drawn inside this distance (m); animated inside `active`. */
  draw: { low: 90, medium: 130, high: 160, ultra: 180 } as Record<WildQuality, number>,
  active: { low: 55, medium: 80, high: 100, ultra: 120 } as Record<WildQuality, number>,
  max: { cattle: 12, goat: 16, dog: 8, flocks: 4, flock: 14 },
  /** Close-range appearance guard: an animal that would first appear within `guard` m inside the player's forward cone stays hidden until the player is `release` m away. */
  guard: 22, release: 40, cone: Math.cos(55 * Math.PI / 180),
  speed: { cattle: 0.45, goat: 0.6, dog: 2.3 },
} as const;

// ───────────────────────── deterministic randomness ─────────────────────────
export function hash(a: number, b: number, c = 0) { let h = (Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const seeded = (seed: number) => { let s = (seed * 4294967296) >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

// ───────────────────────── placement ─────────────────────────
export interface Grazer { id: string; kind: "cattle" | "goat"; x: number; z: number; yaw: number; roam: number; seed: number; tint: number; rests: boolean }
export interface Dog { id: string; kind: "dog"; ax: number; az: number; dx: number; dz: number; len: number; seed: number; tint: number }
export interface Flock { id: string; x: number; z: number; radius: number; count: number; seed: number }
export interface CellLife { grazers: Grazer[]; dogs: Dog[]; flocks: Flock[] }

function nearestRoad(x: number, z: number, roads: readonly WRoad[]) { let best: WRoad | undefined, d = Infinity; for (const r of roads) { const k = distToRoad(x, z, r) - r.w / 2; if (k < d) { d = k; best = r; } } return { road: best, kerb: d }; }
const openGround = (x: number, z: number, radius: number) => clearOfParkedVehicles(x, z, radius, 1.2) && clearOfStandingPeople(x, z, radius, 2) && clearOfReserved(x, z, radius + 2);

/** Everything that lives in one 96 m cell. Depends only on the cell and the road network, so it never reshuffles. */
export function cellLife(cx: number, cz: number, roads: RoadQuery): CellLife {
  const C = WILDLIFE.cell, x0 = cx * C, z0 = cz * C; const rnd = seeded(hash(cx, cz, 7)); const out: CellLife = { grazers: [], dogs: [], flocks: [] };
  const near = roads(x0 + C / 2, z0 + C / 2, C); if (!near.length) return out;
  const samples = Array.from({ length: 12 }, () => { const x = x0 + rnd() * C, z = z0 + rnd() * C; return { x, z, ...nearestRoad(x, z, near) }; });
  const want = { cattle: rnd() < 0.38, pair: rnd() < 0.3, goats: rnd() < 0.3, herd: 2 + Math.floor(rnd() * 3), dog: rnd() < 0.5, side: rnd() < 0.5 ? 1 : -1, pick: rnd(), flock: rnd() < 0.28, birds: 8 + Math.floor(rnd() * 7) };

  if (want.cattle) { const s = samples.find(p => p.road && p.kerb >= (WILDLIFE.fast.has(p.road.cls ?? "") ? 6 : 2.6) && p.kerb <= 11 && openGround(p.x, p.z, 1.4));
    if (s) { const along = Math.atan2(s.road!.dx, s.road!.dz); const n = want.pair ? 2 : 1;
      for (let i = 0; i < n; i++) { const x = s.x + s.road!.dx * i * 2.6, z = s.z + s.road!.dz * i * 2.6; const kerb = kerbDistance(x, z, near); if (i && (kerb < 2.6 || !openGround(x, z, 1.4))) continue;
        out.grazers.push({ id: `c${cx}:${cz}:${i}`, kind: "cattle", x, z, yaw: along + (rnd() - 0.5) * 1.2 + (rnd() < 0.5 ? Math.PI : 0), roam: Math.min(3.5, Math.max(0.5, kerb - 1.8)), seed: rnd(), tint: Math.floor(rnd() * 5), rests: rnd() < 0.45 }); } } }

  if (want.goats) { const s = samples.find(p => p.road && WILDLIFE.quiet.has(p.road.cls ?? "") && p.road.w <= 8 && p.kerb >= 5 && p.kerb <= 22 && openGround(p.x, p.z, 2.4) && !out.grazers.some(g => Math.hypot(g.x - p.x, g.z - p.z) < 7));
    if (s) for (let i = 0; i < want.herd; i++) { const a = rnd() * Math.PI * 2, r = i ? 0.9 + rnd() * 1.1 : 0; const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
      out.grazers.push({ id: `g${cx}:${cz}:${i}`, kind: "goat", x, z, yaw: rnd() * Math.PI * 2, roam: Math.min(2.2, Math.max(0.5, s.kerb - 3.4)), seed: rnd(), tint: Math.floor(rnd() * 4), rests: rnd() < 0.25 }); } }

  if (want.dog) { const mine = near.filter(r => !WILDLIFE.fast.has(r.cls ?? "") && r.len >= 14 && Math.floor((r.a[0] + r.b[0]) / 2 / C) === cx && Math.floor((r.a[1] + r.b[1]) / 2 / C) === cz);
    const road = mine[Math.floor(want.pick * mine.length)];
    if (road) { const off = (road.w / 2 + 2.1) * want.side; const others = near.filter(r => r !== road); let best = { from: 0, len: 0 }, from = -1;
      for (let d = 0; d <= road.len + 1e-6; d += 2) { const x = road.a[0] + road.dx * d + road.nx * off, z = road.a[1] + road.dz * d + road.nz * off; const ok = clearOfCarriageways(x, z, 0.5, others) && clearOfParkedVehicles(x, z, 0.5, 0.8) && clearOfReserved(x, z, 0.5);
        if (ok && from < 0) from = d; if ((!ok || d + 2 > road.len) && from >= 0) { const end = ok ? d : d - 2; if (end - from > best.len) best = { from, len: end - from }; from = -1; } }
      if (best.len >= 8) out.dogs.push({ id: `d${cx}:${cz}`, kind: "dog", ax: road.a[0] + road.dx * best.from + road.nx * off, az: road.a[1] + road.dz * best.from + road.nz * off, dx: road.dx, dz: road.dz, len: Math.min(best.len, 46), seed: rnd(), tint: Math.floor(rnd() * 4) }); } }

  if (want.flock) { const s = samples.find(p => p.kerb >= 3.5 && p.kerb <= 30 && openGround(p.x, p.z, 2) && !out.grazers.some(g => Math.hypot(g.x - p.x, g.z - p.z) < 5));
    if (s) out.flocks.push({ id: `p${cx}:${cz}`, x: s.x, z: s.z, radius: Math.min(4.5, Math.max(1.5, s.kerb - 0.8)), count: want.birds, seed: rnd() }); }
  return out;
}

/** Wildlife in every cell within `range` of a point, nearest first, capped per species. */
export function wildlifeAround(x: number, z: number, range: number, roads: RoadQuery): CellLife {
  const C = WILDLIFE.cell; const all: CellLife = { grazers: [], dogs: [], flocks: [] };
  for (let cx = Math.floor((x - range) / C); cx <= Math.floor((x + range) / C); cx++) for (let cz = Math.floor((z - range) / C); cz <= Math.floor((z + range) / C); cz++) { const c = cellLife(cx, cz, roads); all.grazers.push(...c.grazers); all.dogs.push(...c.dogs); all.flocks.push(...c.flocks); }
  const by = <T extends { x?: number; z?: number; ax?: number; az?: number }>(a: T, b: T) => Math.hypot((a.x ?? a.ax!) - x, (a.z ?? a.az!) - z) - Math.hypot((b.x ?? b.ax!) - x, (b.z ?? b.az!) - z);
  const cattle = all.grazers.filter(g => g.kind === "cattle").sort(by).slice(0, WILDLIFE.max.cattle), goats = all.grazers.filter(g => g.kind === "goat").sort(by).slice(0, WILDLIFE.max.goat);
  return { grazers: [...cattle, ...goats], dogs: all.dogs.sort(by).slice(0, WILDLIFE.max.dog), flocks: all.flocks.sort(by).slice(0, WILDLIFE.max.flocks) };
}

// ───────────────────────── behaviour ─────────────────────────
export interface GroundPose { x: number; z: number; yaw: number; /** 0 standing still, 1 walking or trotting */ gait: number; /** 0 standing, 1 lying down */ down: number; /** head pitch, positive lowers it to graze or sniff */ head: number; phase: number }
const PERIOD = 16;
function waypoint(g: Grazer, n: number): [number, number] {
  if (g.rests && ((n % 3) + 3) % 3 === 0) n -= 1; // a resting period keeps the previous spot
  const s = Math.floor(g.seed * 1e6); const a = hash(s, n, 1) * Math.PI * 2, r = g.roam * Math.sqrt(hash(s, n, 2)); return [g.x + Math.cos(a) * r, g.z + Math.sin(a) * r];
}
/** Cattle and goats: amble to a new spot inside the roam circle, graze, sometimes lie down for a whole period. */
export function grazerPose(g: Grazer, t: number): GroundPose {
  const tt = t + g.seed * 97; const n = Math.floor(tt / PERIOD), u = tt - n * PERIOD; const from = waypoint(g, n - 1), to = waypoint(g, n);
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]); const resting = g.rests && ((n % 3) + 3) % 3 === 0; const speed = WILDLIFE.speed[g.kind];
  const walk = dist / speed, k = dist < 1e-6 ? 1 : Math.min(1, u / walk); const e = k * k * (3 - 2 * k); // ease in and out of each walk
  const moving = !resting && k < 1; let yaw = g.yaw;
  if (dist > 1e-6) yaw = Math.atan2(to[0] - from[0], to[1] - from[1]); else { const p = waypoint(g, n - 2); const d2 = Math.hypot(from[0] - p[0], from[1] - p[1]); if (d2 > 1e-6) yaw = Math.atan2(from[0] - p[0], from[1] - p[1]); }
  const lie = resting ? Math.min(1, u / 2.5, (PERIOD - u) / 2.5) : 0; const graze = moving || resting ? 0 : 0.5 + 0.5 * Math.sin(tt * 0.7 + g.seed * 9);
  return { x: from[0] + (to[0] - from[0]) * e, z: from[1] + (to[1] - from[1]) * e, yaw, gait: moving ? Math.sin(Math.PI * k) ** 0.5 : 0, down: Math.max(0, lie), head: resting ? 0.1 : moving ? 0.15 : 0.35 + graze * 0.55, phase: tt * (g.kind === "goat" ? 6.5 : 4.2) };
}
/** Street dog: trot the footpath one way, sniff, trot back, lie down for a while. */
export function dogPose(d: Dog, t: number): GroundPose {
  const go = d.len / WILDLIFE.speed.dog, sniff = 4, lie = 14, T = go * 2 + sniff + lie; const tt = (t + d.seed * 61) % T; const yawF = Math.atan2(d.dx, d.dz); let s: number, yaw = yawF, gait = 0, down = 0, head = 0.05;
  if (tt < go) { s = (tt / go) * d.len; gait = 1; }
  else if (tt < go + sniff) { s = d.len; head = 0.7; }
  else if (tt < go * 2 + sniff) { s = d.len - ((tt - go - sniff) / go) * d.len; yaw = yawF + Math.PI; gait = 1; }
  else { s = 0; yaw = yawF + Math.PI; const u = tt - go * 2 - sniff; down = Math.min(1, u / 1.2, (lie - u) / 1.2); head = 0.2; }
  return { x: d.ax + d.dx * s, z: d.az + d.dz * s, yaw, gait, down: Math.max(0, down), head, phase: t * 10 + d.seed * 20 };
}

export interface BirdPose { x: number; y: number; z: number; yaw: number; bank: number; /** wing angle: 0 flat, negative folded against the body */ wing: number; flying: boolean }
const FOLD = -1.35;
/** Pigeons: every third bird stays down feeding; the rest sit for 20 s, then rise, circle for 16 s and settle again. */
export function pigeonPose(f: Flock, i: number, t: number): BirdPose {
  const s = Math.floor(f.seed * 1e6); const a0 = hash(s, i, 3) * Math.PI * 2, r0 = f.radius * Math.sqrt(hash(s, i, 4)); const gx = f.x + Math.cos(a0) * r0, gz = f.z + Math.sin(a0) * r0;
  const hop = Math.floor((t + i) / 3.5); const gyaw = hash(s, i, hop) * Math.PI * 2; const peck = Math.max(0, Math.sin((t + i * 0.7) * 5)) * 0.02;
  const ground: BirdPose = { x: gx, y: 0.12 + peck, z: gz, yaw: gyaw, bank: 0, wing: FOLD, flying: false };
  if (i % 3 === 0) return ground;
  const T = 36, tt = (t + f.seed * 40) % T; if (tt < 20) return ground;
  const u = tt - 20, lift = Math.min(1, u / 1.8, (16 - u) / 1.8); const k = lift * lift * (3 - 2 * lift);
  const R = 6 + (i % 5) * 1.2, w = 0.75, a = a0 + u * w; const fx = f.x + Math.cos(a) * R, fz = f.z + Math.sin(a) * R, fy = 5.5 + (i % 4) * 0.9 + Math.sin(u * 0.9 + i) * 0.5;
  return { x: gx + (fx - gx) * k, y: ground.y + (fy - ground.y) * k, z: gz + (fz - gz) * k, yaw: Math.atan2(-Math.sin(a), Math.cos(a)), bank: -0.35 * k, wing: Math.sin(t * 15 + i * 1.7) * 0.85, flying: true };
}
/** Black kites (cheel): slow wide circles high over the neighbourhood, wings held in a shallow V with barely a flap. */
export function kitePose(i: number, t: number, cx: number, cz: number): BirdPose {
  const dir = i % 2 ? 1 : -1, R = 26 + i * 8, w = 0.085 * dir * (1 + i * 0.07), a = i * 2.1 + t * w;
  return { x: cx + Math.cos(a) * R + Math.sin(t * 0.021 + i) * 12, y: 36 + i * 6 + Math.sin(t * 0.13 + i * 1.3) * 3, z: cz + Math.sin(a) * R + Math.cos(t * 0.017 + i * 2) * 12, yaw: Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir), bank: -0.3 * dir, wing: 0.16 + Math.sin(t * 0.8 + i) * 0.05, flying: true };
}
/** Crows: perched on a pole's cross-arm, looking about; every so often one flaps out in a short loop and lands again. */
export function crowPose(px: number, py: number, pz: number, i: number, t: number): BirdPose {
  const T = 34 + (i % 5) * 6, tt = (t + i * 7.3) % T; const look = Math.floor((t + i * 1.9) / 2.2); const perch: BirdPose = { x: px, y: py + 0.07, z: pz, yaw: hash(i, look, 5) * Math.PI * 2, bank: 0, wing: FOLD, flying: false };
  if (tt > 5 || i % 3 === 1) return perch; // one in three never leaves; the others loop for 5 s per cycle
  const k = Math.sin((tt / 5) * Math.PI), a = (tt / 5) * Math.PI * 2 + i; const R = 3.2 * k;
  return { x: px + Math.cos(a) * R - R * Math.cos(i), y: py + 0.07 + k * 1.6, z: pz + Math.sin(a) * R - R * Math.sin(i), yaw: Math.atan2(-Math.sin(a), Math.cos(a)), bank: -0.4 * k, wing: Math.sin(t * 12 + i) * 0.8, flying: true };
}

// ───────────────────────── visibility ─────────────────────────
export interface Gate { shown: boolean; held: boolean }
export const newGate = (): Gate => ({ shown: false, held: false });
/** True when (x, z) lies inside the player's forward cone. `heading` follows the game's convention: forward = (sin, cos). */
export function inFrontOf(px: number, pz: number, heading: number, x: number, z: number) { const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz) || 1; return (dx * Math.sin(heading) + dz * Math.cos(heading)) / d > WILDLIFE.cone; }
/**
 * Draw-distance gate with a close-range guard. Animals normally come into view at the edge of the draw range, far away.
 * After a load, respawn or teleport an animal could otherwise materialise a few metres ahead of the player or their car;
 * such an animal is held hidden until the player has moved `release` metres away from it.
 */
export function gateStep(g: Gate, d: number, front: boolean, drawRange: number): Gate {
  if (g.shown) return d > drawRange * 1.08 ? { shown: false, held: false } : g;
  if (d > drawRange) return g.held ? { shown: false, held: false } : g;
  if (g.held) return d >= WILDLIFE.release ? { shown: true, held: false } : g;
  if (d < WILDLIFE.guard && front) return { shown: false, held: true };
  return { shown: true, held: false };
}
