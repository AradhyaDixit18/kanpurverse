import { beforeAll, describe, expect, it } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { stallCollision, type StallKind } from "../apps/web/src/game/propCollisions";
import { createCharacterController, moveCharacter } from "../apps/web/src/game/characterPhysics";
beforeAll(async()=>{await RAPIER.init();});
describe('street furniture contacts',()=>{
 for(const kind of ['chai','thela','cart','rickshaw','cycle'] as StallKind[])it(`prevents walking through ${kind}`,()=>{
  const world=new RAPIER.World({x:0,y:-18,z:0});world.timestep=1/60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(10,.5,10).setTranslation(0,-.5,0));
  const shape=stallCollision(kind,7),fixed=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setRotation({x:0,y:Math.sin(shape.yaw/2),z:0,w:Math.cos(shape.yaw/2)}));
  for(const b of shape.boxes)world.createCollider(RAPIER.ColliderDesc.cuboid(...b.half).setTranslation(...b.p),fixed);
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.95,-4));world.createCollider(RAPIER.ColliderDesc.capsule(.55,.35),body);const controller=createCharacterController(world);world.step();
  let constrained=false;const capsule=new RAPIER.Capsule(.55,.35);
  for(let i=0;i<120;i++){const previous=body.translation();moveCharacter(body,controller,{x:0,y:-.05,z:.1});world.step();const p=body.translation();if(Math.abs(p.z-previous.z-.1)>.002||Math.abs(p.x-previous.x)>.002)constrained=true;expect(world.intersectionWithShape(p,{x:0,y:0,z:0,w:1},capsule,undefined,undefined,body.collider(0),body)).toBeNull();}
  expect(constrained).toBe(true);expect(body.translation().y).toBeGreaterThan(.8);world.free();
 });
});
