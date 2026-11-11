import type { RigidBody, KinematicCharacterController } from "@dimforge/rapier3d-compat";
import { CHARACTER } from "./characterPhysics";
/** Resolve the requested walking target through the same capsule solver as the player. */
export function advancePedestrian(body:RigidBody,controller:KinematicCharacterController,target:{x:number;y:number;z:number},verticalSpeed:number,dt:number){
 const p=body.translation(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),limit=3.2*dt,k=d>limit?limit/d:1;
 const vy=Math.max(-30,verticalSpeed-18*dt);
 controller.computeColliderMovement(body.collider(0),{x:dx*k,y:vy*dt,z:dz*k});
 const m=controller.computedMovement(),feet={x:p.x+m.x,y:p.y+m.y-CHARACTER.feetOffset,z:p.z+m.z};
 body.setNextKinematicTranslation({x:feet.x,y:feet.y+CHARACTER.feetOffset,z:feet.z});
 return {feet,verticalSpeed:controller.computedGrounded()?0:vy,moved:Math.hypot(m.x,m.z)};
}
