import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NetClient } from "../apps/web/src/net/legacyClient";
import { useStore } from "../apps/web/src/state/store";
class SilentSocket {
  static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;static instances:SilentSocket[]=[];
  readyState=0; onopen?:()=>void;onmessage?:(e:{data:string})=>void;onclose?:(e:{code:number;reason:string})=>void;onerror?:()=>void;
  constructor(){SilentSocket.instances.push(this);}
  close(){this.readyState=3; /* Deliberately no close event: reproduces silent browser CONNECTING. */}
  send(){}
  open(){this.readyState=1;this.onopen?.();}
  receive(m:unknown){this.onmessage?.({data:JSON.stringify(m)});}
}
let client:NetClient;
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('WebSocket',SilentSocket);SilentSocket.instances=[];client=new NetClient();useStore.getState().set({screen:'loading',connected:false,name:'Loading_QA'});});
afterEach(()=>{client.disconnect();vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});
it('turns a silent CONNECTING socket into bounded retry and a recoverable error',()=>{client.connect('loading');vi.advanceTimersByTime(75001);expect(SilentSocket.instances.length).toBeGreaterThan(1);expect(client.status().wantOpen).toBe(false);expect(useStore.getState().screen).toBe('error');const n=SilentSocket.instances.length;vi.advanceTimersByTime(60000);expect(SilentSocket.instances).toHaveLength(n);});
it('also bounds an open socket that never answers hello/join',()=>{client.connect('loading');SilentSocket.instances[0].open();vi.advanceTimersByTime(75001);expect(useStore.getState().screen).toBe('error');expect(client.status().wantOpen).toBe(false);});
it('cancelling cannot reconnect later or overwrite the menu',()=>{client.connect('loading');const old=SilentSocket.instances[0];client.disconnect();useStore.getState().set({screen:'menu'});old.receive({t:'joined',room:'loading',players:[],vehicles:[],time:.4});vi.advanceTimersByTime(120000);expect(SilentSocket.instances).toHaveLength(1);expect(useStore.getState().screen).toBe('menu');});
it('a successful join cancels startup deadlines and retains the connection',()=>{client.connect('loading');const ws=SilentSocket.instances[0];ws.open();ws.receive({t:'joined',room:'loading',players:[],vehicles:[],time:.4});vi.advanceTimersByTime(120000);expect(useStore.getState().screen).toBe('play');expect(client.status().wantOpen).toBe(true);expect(SilentSocket.instances).toHaveLength(1);});
it('ignores a superseded socket join after the user cancels and retries',()=>{client.connect('first');const old=SilentSocket.instances[0];client.disconnect();client.connect('next');old.receive({t:'joined',room:'first',players:[],vehicles:[],time:.4});expect(useStore.getState().screen).toBe('loading');});
