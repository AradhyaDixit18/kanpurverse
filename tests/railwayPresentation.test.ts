import { describe, it, expect } from "vitest";
import { mainLine, coachPoses, trainState } from "../apps/web/src/game/RailwayOsm";
import type { GeoData } from "../apps/web/src/game/roads";
const geo = { rails: [{ pts: [[0,0],[0,500],[500,500]], tracks:1, id:1 }], stations: [] } as unknown as GeoData;
const line = mainLine(geo), cum=[0,500,1000];
describe("railway render geometry and shared schedule",()=>{
 it("reuses one connected route per extract",()=>{expect(mainLine(geo)).toBe(line);});
 for(const dir of [1,-1]) it(`aligns long X axis and coach centres with track, direction ${dir}`,()=>{const p=coachPoses(line,cum,250,dir,7);p.forEach(c=>{expect(c.x).toBeCloseTo(0);expect(Math.cos(c.yaw)).toBeCloseTo(0);expect(-Math.sin(c.yaw)).toBeCloseTo(dir);});expect(Math.abs(p[0].z-p[1].z)).toBeCloseTo(15);});
 it("keeps distinct coach positions inside track at both terminals",()=>{for(const centre of [0,1000]){const poses=coachPoses(line,cum,centre,1,7);expect(new Set(poses.map(p=>`${p.x},${p.z}`)).size).toBe(7);poses.forEach(p=>{expect(p.x).toBeGreaterThanOrEqual(0);expect(p.z).toBeGreaterThanOrEqual(0);expect(p.x).toBeLessThanOrEqual(500);expect(p.z).toBeLessThanOrEqual(500);});}});
 it("retains schedule positions while sharing repeated clock evaluation",()=>{const time=20/86400;const state=trainState(geo,line,cum,time);expect(state?.s).toBeCloseTo(360);expect(trainState(geo,line,cum,time)).toBe(state); expect(trainState(geo,line,cum,1/86400)?.s).toBeCloseTo(2.16);});
});
