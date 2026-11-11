import type { World, RigidBody, Shape } from "@dimforge/rapier3d-compat";
export interface TrafficRoad { a:[number,number];len:number;dx:number;dz:number;nx:number;nz:number;w:number }
/** A continuous road-contained loop replaces instantaneous lane/heading flips at segment ends. */
export function trafficPose(road:TrafficRoad,distance:number){
 const r=Math.max(.5,Math.min(road.w/4,road.len/4)),straight=road.len-2*r,arc=Math.PI*r,period=2*straight+2*arc;
 let s=((distance%period)+period)%period,u=0,v=0,du=0,dv=0;
 if(s<straight){u=r+s;v=r;du=1;}
 else if((s-=straight)<arc){const t=s/r;u=road.len-r+r*Math.sin(t);v=r*Math.cos(t);du=Math.cos(t);dv=-Math.sin(t);}
 else if((s-=arc)<straight){u=road.len-r-s;v=-r;du=-1;}
 else{ s-=straight;const t=s/r;u=r-r*Math.sin(t);v=-r*Math.cos(t);du=-Math.cos(t);dv=Math.sin(t); }
 return {x:road.a[0]+road.dx*u+road.nx*v,z:road.a[1]+road.dz*u+road.nz*v,yaw:Math.atan2(road.dx*du+road.nx*dv,road.dz*du+road.nz*dv),period};
}
export function trafficStepClear(world:World,body:RigidBody,shape:Shape,next:{x:number;y:number;z:number;yaw:number}){
 const p=body.translation(),q=body.rotation(),delta={x:(next.x-p.x)*3,y:0,z:(next.z-p.z)*3},rotation={x:0,y:Math.sin(next.yaw/2),z:0,w:Math.cos(next.yaw/2)};
 // Look ahead three physics steps so mutually approaching kinematic cars stop before contact.
 if(world.castShape(p,q,delta,shape,0,1,true,undefined,undefined,body.collider(0),body))return false;
 return !world.intersectionWithShape(next,rotation,shape,undefined,undefined,body.collider(0),body);
}
