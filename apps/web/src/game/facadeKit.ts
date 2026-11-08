/** Original metric architecture kit. Footprints stay unchanged; detail is visual, hulls are separate. */
export interface FacadeBuilding { pts: [number, number][]; h: number; style: number; shop: boolean; kind?: string }
export interface FacadePart { p: [number,number,number]; size: [number,number,number]; yaw: number; color: string }
export type FacadeParts = Record<"trim"|"glass"|"metal"|"shade", FacadePart[]>;
export function facadeParts(buildings: FacadeBuilding[]): FacadeParts {
  const out: FacadeParts = { trim: [], glass: [], metal: [], shade: [] };
  for (const b of buildings) {
    const ring = b.pts.length > 2 && b.pts[0][0] === b.pts.at(-1)![0] && b.pts[0][1] === b.pts.at(-1)![1] ? b.pts.slice(0,-1) : b.pts;
    if (ring.length < 3 || !Number.isFinite(b.h) || b.h < 3) continue;
    let area=0; for(let i=0;i<ring.length;i++){const a=ring[i],c=ring[(i+1)%ring.length];area+=a[0]*c[1]-c[0]*a[1];}
    const poly=area<0?ring:[...ring].reverse(), floors=Math.max(1,Math.round(b.h/3.2)), floor=b.h/floors;
    const colour=["#d8c7a7","#cbb79c","#d6cfc1","#bcc2b5"][b.style%4];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],c=poly[(i+1)%poly.length],len=Math.hypot(c[0]-a[0],c[1]-a[1]); if(len<2.8) continue;
      const tx=(c[0]-a[0])/len,tz=(c[1]-a[1])/len,nx=-tz,nz=tx,yaw=Math.atan2(-tz,tx),bays=Math.max(1,Math.round(len/4)),bay=len/bays;
      const add=(layer:keyof FacadeParts,u:number,y:number,depth:number,size:FacadePart['size'],color:string)=>out[layer].push({p:[a[0]+tx*u+nx*depth,y,a[1]+tz*u+nz*depth],size,yaw,color});
      // Parapet, continuous coping and projecting cornice establish a real roof silhouette.
      add("trim",len/2,b.h+.34,0,[len,.68,.18],colour); add("trim",len/2,b.h+.7,0,[len+.12,.12,.34],"#e6d9c2"); add("trim",len/2,b.h-.18,.12,[len,.18,.38],colour);
      for(let f=0;f<floors;f++){
        if(f===0&&b.shop) continue;
        for(let j=0;j<bays;j++){
          const u=(j+.5)*bay,y=f*floor+floor*.53,w=Math.min(1.65,bay*.48),h=Math.min(1.6,floor*.48);
          add("glass",u,y,.045,[w,h,.07],b.style%2?"#31464c":"#34485b");
          for(const side of [-1,1])add("trim",u+side*(w/2+.06),y,.13,[.12,h+.22,.2],colour);
          add("trim",u,y+h/2+.08,.14,[w+.24,.14,.24],colour); add("trim",u,y-h/2-.08,.2,[w+.36,.14,.45],"#ddd3bd");
          add("metal",u,y,.14,[.055,h,.06],"#5b6462");
          if(f>0&&(b.style+i+j)%4===1){
            add("shade",u,y+h/2+.23,.4,[w+.65,.12,.9],b.style%2?"#687a70":"#a48668");
            add("trim",u,y-h/2-.2,.5,[w+.7,.16,1.15],colour);
            add("metal",u,y-h/2+.65,1.02,[w+.65,.06,.06],"#4e5c58");
            for(let k=0;k<6;k++)add("metal",u-(w+.6)/2+k*(w+.6)/5,y-h/2+.23,1.02,[.035,.8,.035],"#4e5c58");
          }
          if(f>0&&(j+i+b.style)%7===0){add("shade",u+bay*.34,y-.25,.28,[.55,.42,.45],"#b7b5a6");for(let k=0;k<4;k++)add("metal",u+bay*.34,y-.39+k*.09,.52,[.45,.025,.02],"#636b68");}
        }
      }
      if(b.shop){for(let j=0;j<bays;j++){const u=(j+.5)*bay;add("shade",u,2.85,.45,[bay-.12,.13,1.12],b.style%2?"#4f766c":"#9a6c4c"); for(const side of [-1,1])add("trim",u+side*(bay/2-.12),1.35,.18,[.18,2.7,.3],colour);}}
    }
  }
  return out;
}
