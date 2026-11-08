/** Spatial candidate index preserving the original road query and source order exactly. */
export interface IndexedRoad { a:[number,number]; b:[number,number]; len:number }
const CELL=128;
export class RoadIndex<T extends IndexedRoad> {
  private cells=new Map<string,number[]>(); private large:number[]=[];
  constructor(private roads:T[]) { roads.forEach((s,i)=>{const x=(s.a[0]+s.b[0])/2,z=(s.a[1]+s.b[1])/2,r=s.len/2;
    if(r>CELL*8){this.large.push(i);return;}
    for(let tx=Math.floor((x-r)/CELL);tx<=Math.floor((x+r)/CELL);tx++)for(let tz=Math.floor((z-r)/CELL);tz<=Math.floor((z+r)/CELL);tz++){const key=`${tx},${tz}`;const list=this.cells.get(key)??[];list.push(i);this.cells.set(key,list);}
  }); }
  near(x:number,z:number,r:number):T[]{
    if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(r)||r<0)return [];
    // Large map views should scan once rather than iterate thousands of empty cells.
    if(r>2048)return this.roads.filter(s=>this.matches(s,x,z,r));
    const indices=new Set(this.large);for(let tx=Math.floor((x-r)/CELL);tx<=Math.floor((x+r)/CELL);tx++)for(let tz=Math.floor((z-r)/CELL);tz<=Math.floor((z+r)/CELL);tz++)for(const i of this.cells.get(`${tx},${tz}`)??[])indices.add(i);
    return [...indices].sort((a,b)=>a-b).map(i=>this.roads[i]).filter(s=>this.matches(s,x,z,r));
  }
  private matches(s:T,x:number,z:number,r:number){const dx=(s.a[0]+s.b[0])/2-x,dz=(s.a[1]+s.b[1])/2-z,R=r+s.len/2;return dx*dx+dz*dz<R*R;}
}
