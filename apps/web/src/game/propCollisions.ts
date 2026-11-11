export type StallKind="thela"|"chai"|"rickshaw"|"cycle"|"cart";
export interface PropBox { p:[number,number,number]; half:[number,number,number] }
/** Collision proxies for solid street furniture; bunting, signs and loose wires stay visual. */
export function stallCollision(kind:StallKind,seed:number):{yaw:number;boxes:PropBox[]}{
 const random=(((seed+1)*1664525+1013904223)%4294967296)/4294967296;
 if(kind==='chai')return {yaw:0,boxes:[{p:[0,.5,0],half:[1.1,.5,.55]},{p:[1.6,.25,.4],half:[.2,.25,.2]},{p:[-1.7,.25,.3],half:[.2,.25,.2]}]};
 if(kind==='thela'||kind==='cart')return {yaw:0,boxes:[{p:[0,.5,0],half:[.9,.4,.52]},{p:[0,1.85,0],half:[1.1,.02,.7]}]};
 if(kind==='rickshaw')return {yaw:random*.6-.3,boxes:[{p:[0,.9,-.3],half:[.5,.25,.45]},{p:[0,1.35,-.55],half:[.5,.3,.05]},{p:[0,.5,.55],half:[.3,.4,.75]}]};
 return {yaw:random*.5,boxes:[{p:[0,.5,0],half:[.25,.5,.86]}]};
}
