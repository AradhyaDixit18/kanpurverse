"use client";
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { playerPos } from '../refs';
import { streetRuntime } from '../streetRuntime';
/** Development-only real gameplay recording. Labels mirror live state, never simulate features. */
export function StreetCapture(){
 const recorder=useRef<MediaRecorder|null>(null),end=useRef<()=>void>(()=>{});const [status,setStatus]=useState('Capture ready'); const [recording,setRecording]=useState(false);
 const [telemetry,setTelemetry]=useState('');
 useEffect(()=>{const timer=setInterval(()=>{const s=useStore.getState();setTelemetry(JSON.stringify({p:[+playerPos.x.toFixed(1),+playerPos.z.toFixed(1)],gutka:s.profile?.inventory?.gutka,civic:s.profile?.civic,fps:s.fps,stains:streetRuntime.stains,impacts:streetRuntime.impacts,near:s.nearby?.id,action:s.streetAction?.action}));},300);return()=>{clearInterval(timer);end.current();};},[]);
 async function save(blob:Blob,kind:string){const response=await fetch(`/api/dev/street-capture?kind=${kind}`,{method:'POST',body:blob});if(!response.ok)throw new Error('Capture save failed');const data=await response.json();setStatus(`Saved ${data.file}`);}
 function start(){
 const source=document.querySelector('canvas[data-engine]') as HTMLCanvasElement|null ?? document.querySelector('canvas');if(!source)return;
 const composite=document.createElement('canvas');composite.width=1080;composite.height=1920;const ctx=composite.getContext('2d')!;
 let raf=0;const paint=()=>{const sw=source.width,sh=source.height;ctx.fillStyle='#0b0b0d';ctx.fillRect(0,0,1080,1920);
 // Portrait framing of the actual canvas, retaining the full horizontal action in a central window.
 const cw=sh*1080/1920;ctx.drawImage(source,(sw-cw)/2,0,cw,sh,0,0,1080,1920);
 const s=useStore.getState();ctx.fillStyle='#ffd23f';ctx.font='700 40px sans-serif';ctx.fillText('KANPURVERSE  /  EARLY BUILD',60,200);ctx.fillStyle='#eee';ctx.font='30px sans-serif';ctx.fillText(`Gutka ×${s.profile?.inventory?.gutka??0}   |   Civic ${s.profile?.civic??100}/100`,60,260);
 const panel=document.querySelector('.dlg-card');if(panel){ctx.fillStyle='#0b0b0deb';ctx.fillRect(50,850,980,460);ctx.fillStyle='#ffd23f';ctx.font='bold 36px sans-serif';ctx.fillText(document.querySelector('.dlg-name')?.textContent??'NPC',80,910);ctx.fillStyle='#fff';ctx.font='32px sans-serif';const line=document.querySelector('.dlg-text')?.textContent??'';ctx.fillText(line.slice(0,38),80,985);ctx.fillText(line.slice(38,76),80,1035);const shop=document.querySelector('.street-shop');if(shop){ctx.fillStyle='#ffd23f';ctx.fillText(`Gutka / गुटखा · 5 coins · Inventory ${s.profile?.inventory?.gutka??0}`,80,1120);}ctx.fillStyle='#ccc';ctx.fillText('नमस्ते  ·  कनपुरिया मज़ाक  ·  माफ़ी',80,1220);}
 const sub=s.subtitle;if(sub&&sub.until>Date.now()){ctx.font='32px sans-serif';ctx.fillStyle='#fff';const text=sub.text;ctx.fillText(text.slice(0,45),60,1510);if(text.length>45)ctx.fillText(text.slice(45,90),60,1570);}
 raf=requestAnimationFrame(paint);};paint();
 const stream=composite.captureStream(30),chunks:Blob[]=[];const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:7_000_000});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=()=>{cancelAnimationFrame(raf);stream.getTracks().forEach(t=>t.stop());void save(new Blob(chunks,{type:'video/webm'}),'webm').catch(e=>setStatus(String(e)));};recorder.current=rec;rec.start(1000);setRecording(true);setStatus('Recording actual canvas');end.current=()=>{if(rec.state==='recording')rec.stop();setRecording(false);};
 }
 async function shot(){const c=document.querySelector('canvas[data-engine]') as HTMLCanvasElement|null??document.querySelector('canvas');c?.toBlob(b=>{if(b)void save(b,'png');});}
 return <aside style={{position:'fixed',right:12,bottom:90,zIndex:60,background:'#111e',color:'#ddd',padding:10,fontSize:11,maxWidth:360,pointerEvents:'auto'}}><button onClick={()=>recording?end.current():start()}>{recording?'Stop reel capture':'Record reel capture'}</button><button onClick={shot}>Save feature frame</button><button onClick={()=>void save(new Blob([telemetry],{type:'application/json'}),'json')}>Save QA state</button><output style={{display:'block'}}>{status}</output><output style={{display:'block'}}>{telemetry}</output></aside>;
}
