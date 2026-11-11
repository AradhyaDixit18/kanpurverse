"use client";
import { Component, type ReactNode } from "react";
import { useStore } from "../state/store";
import { net } from "../net/client";
export class EngineBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:unknown){console.warn("KanpurVerse city startup failed",error);}
  render(){if(!this.state.failed)return this.props.children;const en=useStore.getState().settings.lang==="english";return <div className="screen center"><h2>{en?"The city could not finish loading":"शहर लोड नहीं हो पाया"}</h2><p>{en?"Reload to retry the graphics and city download. Your saved character is safe.":"शहर और ग्राफ़िक्स फिर लोड करने के लिए कोशिश करें। आपका किरदार सुरक्षित है।"}</p><button className="btn" onClick={()=>location.reload()}>{en?"Reload game":"फिर लोड करो"}</button><button className="btn" onClick={()=>{net.disconnect();useStore.getState().set({screen:"menu"});}}>{en?"Back to menu":"मेन्यू पर वापस"}</button></div>;}
}
