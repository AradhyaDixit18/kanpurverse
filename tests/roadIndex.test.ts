import { it, expect } from "vitest";
import { RoadIndex } from "../apps/web/src/game/roadIndex";
it("preserves original road membership and ordering at negative cells, edges and long diagonals",()=>{
 const roads=Array.from({length:500},(_,i)=>{const a:[number,number]=[(i*97)%4000-2000,(i*61)%4000-2000],b:[number,number]=[a[0]+(i%13)*65,a[1]-(i%7)*85];return {a,b,len:Math.hypot(b[0]-a[0],b[1]-a[1]),id:i};});roads.push({a:[-5000,-5000],b:[5000,5000],len:Math.hypot(10000,10000),id:501});const index=new RoadIndex(roads);
 for(const x of [-2000,-128,-.001,0,128,2000])for(const z of [-2500,-128,0,128])for(const r of [0,1,90,220,320,3000])expect(index.near(x,z,r)).toEqual(roads.filter(s=>Math.hypot((s.a[0]+s.b[0])/2-x,(s.a[1]+s.b[1])/2-z)<r+s.len/2));
});
