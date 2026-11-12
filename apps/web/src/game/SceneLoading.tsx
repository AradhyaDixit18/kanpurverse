"use client";
import { Html } from "@react-three/drei";
import { useStore } from "../state/store";
import { net } from "../net/client";
/** Real asset suspense has its own visible loading state. */
export function SceneLoading() {
  const en=useStore(s=>s.settings.lang==="english");
  return <Html fullscreen><div role="status" style={{position:"absolute",inset:0,display:"grid",placeContent:"center",textAlign:"center",background:"#121921",color:"#eee",fontFamily:"system-ui",pointerEvents:"auto"}}><h2>{en?"Preparing Kanpur’s streets":"कानपुर की गलियाँ तैयार हो रही हैं"}</h2><p>{en?"Loading the city and its textures…":"शहर और उसके रंग लोड हो रहे हैं…"}</p><button onClick={()=>{net.disconnect();useStore.getState().set({screen:"menu"});}}>{en?"Back to menu":"मेन्यू पर वापस"}</button></div></Html>;
}
