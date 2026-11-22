/**
 * Weather model. Pure and deterministic: no three.js, no React, no clock. The renderer reads a `WeatherLook` and applies it to
 * the sky, fog, lights, roads and rain; the driving model reads `grip`. Every field is a multiplier or a 0..1 amount, so
 * "clear" is the identity and the existing look is unchanged when weather is clear.
 */
export type WeatherKind = "clear" | "overcast" | "rain" | "fog";
export const WEATHER_KINDS: readonly WeatherKind[] = ["clear", "overcast", "rain", "fog"];

export interface WeatherLook {
  /** Multiplier on direct sunlight. */ sun: number;
  /** Multiplier on ambient and sky light (overcast skies light shadows from everywhere). */ ambient: number;
  /** 0..1 pull of sky and fog colour towards grey. */ grey: number;
  /** 0..1 cloud cover in the sky shader. */ cloud: number;
  /** Multipliers on the fog near and far distances. */ fogNear: number; fogFar: number;
  /** 0..1 rain intensity (drives the streaks). */ rain: number;
  /** 0..1 road wetness (lower roughness, darker asphalt, stronger reflections). */ wet: number;
  /** Multiplier on tyre grip on road surfaces. */ grip: number;
  /** 0..1 wind strength: sways leaves and branches and slants the rain. */ wind: number;
}

export const WEATHER_LOOKS: Record<WeatherKind, WeatherLook> = {
  clear:    { sun: 1,    ambient: 1,    grey: 0,    cloud: 0,   fogNear: 1,    fogFar: 1,    rain: 0, wet: 0,    grip: 1,    wind: 0.28 },
  overcast: { sun: 0.38, ambient: 1.2,  grey: 0.45, cloud: 1,   fogNear: 0.85, fogFar: 0.9,  rain: 0, wet: 0,    grip: 1,    wind: 0.4 },
  rain:     { sun: 0.22, ambient: 1.15, grey: 0.6,  cloud: 1,   fogNear: 0.5,  fogFar: 0.65, rain: 1, wet: 1,    grip: 0.88, wind: 0.75 },
  fog:      { sun: 0.45, ambient: 1.2,  grey: 0.4,  cloud: 0.5, fogNear: 0.06, fogFar: 0.3,  rain: 0, wet: 0.35, grip: 0.95, wind: 0.1 },
};

export const cloneLook = (l: WeatherLook): WeatherLook => ({ ...l });

/**
 * Move `cur` towards `target` in place and return it. Changes ease in over a few seconds. Roads dry far more slowly than rain
 * stops, so a wet street stays wet for a while after the shower ends.
 */
export function stepLook(cur: WeatherLook, target: WeatherLook, dt: number, rate = 0.45): WeatherLook {
  const k = 1 - Math.exp(-Math.max(0, dt) * rate);
  const dry = 1 - Math.exp(-Math.max(0, dt) * rate * 0.2);
  for (const key of Object.keys(cur) as (keyof WeatherLook)[]) {
    const kk = key === "wet" && target.wet < cur.wet ? dry : k;
    cur[key] += (target[key] - cur[key]) * kk;
    if (Math.abs(target[key] - cur[key]) < 1e-4) cur[key] = target[key];
  }
  return cur;
}
