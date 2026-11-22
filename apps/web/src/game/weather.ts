/**
 * Runtime weather state shared by the sky, rain, road materials and driving. `weatherNow` is mutated in place each frame by
 * `stepWeather` (called from Sky.tsx), so readers never allocate. The maths lives in packages/shared/src/weather.ts.
 */
import type * as THREE from "three";
import { WEATHER_LOOKS, cloneLook, stepLook, type WeatherKind, type WeatherLook } from "@kanpurverse/shared";

export const weatherNow: WeatherLook = cloneLook(WEATHER_LOOKS.clear);

export function stepWeather(kind: WeatherKind, dt: number): WeatherLook {
  stepLook(weatherNow, WEATHER_LOOKS[kind] ?? WEATHER_LOOKS.clear, Math.min(dt, 0.25));
  return weatherNow;
}

interface WetMat { m: THREE.MeshStandardMaterial; rough: number; wetRough: number; color: THREE.Color; env: number }
const wet = new Map<THREE.MeshStandardMaterial, WetMat>();
let lastWet = -1;

/** Register a road or pavement material so it darkens and turns glossy in the wet. `wetRough` is its roughness at full wetness. */
export function registerWet(m: THREE.MeshStandardMaterial | null, wetRough: number) {
  if (!m || wet.has(m)) return;
  wet.set(m, { m, rough: m.roughness, wetRough, color: m.color.clone(), env: m.envMapIntensity ?? 1 }); lastWet = -1;
}

/** Apply wetness 0..1 to every registered material. Cheap no-op when the value has not changed. */
export function applyWetness(w: number) {
  if (Math.abs(w - lastWet) < 0.004) return; lastWet = w;
  for (const e of wet.values()) {
    e.m.roughness = e.rough + (e.wetRough - e.rough) * w;
    e.m.color.copy(e.color).multiplyScalar(1 - 0.32 * w);
    e.m.envMapIntensity = e.env * (1 + 1.6 * w);
  }
}
