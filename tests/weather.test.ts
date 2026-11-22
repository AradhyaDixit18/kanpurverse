import { describe, it, expect } from "vitest";
import { WEATHER_LOOKS, WEATHER_KINDS, cloneLook, stepLook } from "../packages/shared/src/weather";

describe("weather looks", () => {
  it("clear is the identity so the existing look is unchanged", () => {
    const c = WEATHER_LOOKS.clear; expect(c).toMatchObject({ sun: 1, ambient: 1, grey: 0, cloud: 0, fogNear: 1, fogFar: 1, rain: 0, wet: 0, grip: 1 });
  });
  it("keeps every value in a sensible range", () => {
    for (const k of WEATHER_KINDS) { const l = WEATHER_LOOKS[k];
      for (const key of ["grey", "cloud", "rain", "wet", "wind"] as const) { expect(l[key], `${k}.${key}`).toBeGreaterThanOrEqual(0); expect(l[key], `${k}.${key}`).toBeLessThanOrEqual(1); }
      expect(l.sun).toBeGreaterThan(0); expect(l.fogNear).toBeGreaterThan(0); expect(l.fogFar).toBeGreaterThanOrEqual(l.fogNear); expect(l.grip).toBeGreaterThan(0.5); expect(l.grip).toBeLessThanOrEqual(1); }
  });
  it("orders the conditions the way weather behaves", () => {
    expect(WEATHER_LOOKS.rain.sun).toBeLessThan(WEATHER_LOOKS.overcast.sun); expect(WEATHER_LOOKS.overcast.sun).toBeLessThan(WEATHER_LOOKS.clear.sun);
    expect(WEATHER_LOOKS.fog.fogFar).toBeLessThan(WEATHER_LOOKS.rain.fogFar); expect(WEATHER_LOOKS.rain.grip).toBeLessThan(WEATHER_LOOKS.clear.grip);
    expect(WEATHER_LOOKS.rain.rain).toBe(1); expect(WEATHER_LOOKS.clear.rain).toBe(0);
  });
});

describe("stepLook", () => {
  it("eases towards the target and arrives", () => {
    const cur = cloneLook(WEATHER_LOOKS.clear); stepLook(cur, WEATHER_LOOKS.rain, 1);
    expect(cur.rain).toBeGreaterThan(0); expect(cur.rain).toBeLessThan(1);
    for (let i = 0; i < 600; i++) stepLook(cur, WEATHER_LOOKS.rain, 0.1); expect(cur).toEqual(WEATHER_LOOKS.rain);
  });
  it("never overshoots", () => { const cur = cloneLook(WEATHER_LOOKS.clear); for (let i = 0; i < 50; i++) { stepLook(cur, WEATHER_LOOKS.rain, 5); expect(cur.rain).toBeLessThanOrEqual(1); expect(cur.sun).toBeGreaterThanOrEqual(WEATHER_LOOKS.rain.sun); } });
  it("dries roads more slowly than the rain stops", () => {
    const a = cloneLook(WEATHER_LOOKS.rain), b = cloneLook(WEATHER_LOOKS.rain); stepLook(a, WEATHER_LOOKS.clear, 4);
    expect(1 - a.rain).toBeGreaterThan(1 - a.wet); // rain fraction gone is larger than wetness gone
    void b;
  });
  it("does nothing for a zero step", () => { const cur = cloneLook(WEATHER_LOOKS.rain); stepLook(cur, WEATHER_LOOKS.clear, 0); expect(cur).toEqual(WEATHER_LOOKS.rain); });
});
