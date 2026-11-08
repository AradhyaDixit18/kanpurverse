import { describe, expect, it } from "vitest";
import { SyncedClock } from "../apps/web/src/game/syncedClock";
import { summarizeFrames } from "../apps/web/src/game/qa/frameStats";
import { roundedGeometry } from "../apps/web/src/game/roundedGeometry";
describe("continuous server-anchored visual time", () => {
 it("advances every render frame between 20Hz samples", () => { const c = new SyncedClock(); c.sync(.5, 0); expect((c.read(16) - .5) * 86400).toBeCloseTo(.016, 6); expect(c.read(32)).toBeGreaterThan(c.read(16)); c.sync(.5 + .05 / 86400, 50); expect((c.read(66) - .5) * 86400).toBeCloseTo(.066, 6); });
 it("wraps midnight without a backwards day jump", () => { const c = new SyncedClock(); c.sync((86400 - .02) / 86400, 0); c.sync(.03 / 86400, 50); expect(c.read(66) * 86400).toBeCloseTo(.046, 6); });
 it("smooths jitter, caps stale extrapolation and resyncs after an absence", () => { const c = new SyncedClock(); c.sync(.5, 0); c.sync(.5 + .08 / 86400, 50); expect((c.read(66) - .5) * 86400).toBeCloseTo(.071, 6); expect(c.read(10000)).toBe(c.read(550)); c.sync(.6, 10000); expect(c.read(10000)).toBeCloseTo(.6); });
 it("ignores invalid samples and supports fresh room reset", () => { const c = new SyncedClock(); c.sync(NaN, 0); expect(c.initialized).toBe(false); c.sync(.5,0); c.reset(); expect(c.initialized).toBe(false); c.sync(.3,1,true); expect(c.read(1)).toBeCloseTo(.3); });
});
describe("bounded shared silhouette geometry", () => {
 for (const size of [[.05,.07,.03],[.16,.3,.01],[.48,.56,.27]] as [number,number,number][]) it(`keeps ${size} bevel inside original metric bounds`,()=>{ const g=roundedGeometry(size,.09); expect(roundedGeometry(size,.09)).toBe(g); const p=g.getAttribute("position"),n=g.getAttribute("normal"),uv=g.getAttribute("uv"); for(let i=0;i<p.count;i++){expect(Math.abs(p.getX(i))).toBeLessThanOrEqual(size[0]/2+1e-6);expect(Math.abs(p.getY(i))).toBeLessThanOrEqual(size[1]/2+1e-6);expect(Math.abs(p.getZ(i))).toBeLessThanOrEqual(size[2]/2+1e-6);expect(Number.isFinite(n.getX(i))).toBe(true);expect(Number.isFinite(uv.getX(i))).toBe(true);} expect(p.count/3).toBeLessThanOrEqual(300); });
 it("rejects invalid dimensions",()=>expect(()=>roundedGeometry([1,NaN,1],.1)).toThrow());
});
it("frame statistics retain long stalls and use elapsed time for FPS",()=>{ const r=summarizeFrames([{ms:10,calls:10,triangles:20},{ms:10,calls:20,triangles:40},{ms:100,calls:30,triangles:60}]); expect(r.averageFps).toBe(25); expect(r.p95Ms).toBe(100);expect(r.over33Ms).toBe(1);expect(r.meanCalls).toBe(20); });
