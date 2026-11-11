import { describe, it, expect, vi, afterEach } from 'vitest';
import { Room, Player } from '../apps/server/src/room';
import { DEFAULT_APPEARANCE, STREET, streetReply, type S2C } from '../packages/shared/src';
import type { Storage } from '../apps/server/src/storage';
import type { WebSocket } from 'ws';
const rooms:Room[]=[];
afterEach(()=>{rooms.splice(0).forEach(r=>r.destroy());vi.useRealTimers();});
function setup(){const out:S2C[]=[];const saves:unknown[]=[];const room=new Room('street',{putPlayer:async(d:unknown)=>{saves.push(structuredClone(d));}} as unknown as Storage,32);rooms.push(room);const ws={OPEN:1,readyState:1,send:(s:string)=>out.push(JSON.parse(s))} as unknown as WebSocket;
const p=new Player(ws,{_id:'test',name:'Tester',appearance:DEFAULT_APPEARANCE,lang:'hindi',level:1,xp:0,coins:20,missionsCompleted:[],unlocked:[],friends:[],blocked:[],playtimeSec:0,createdAt:0,lastSeenAt:0,reports:0});p.p=[480,1,-326];return {room,p,out,saves};}
describe('street-life server economy and action rules',()=>{
 it('migrates old saves and rejects remote shopping',()=>{const {room,p}=setup();expect(p.profile.inventory?.gutka).toBe(0);p.p=[0,1,0];room.buyGutka(p);expect(p.profile.coins).toBe(20);expect(p.profile.inventory?.gutka).toBe(0);});
 it('supports repeat packets, enforces money/cap and persists',()=>{const {room,p,saves}=setup();room.buyGutka(p);room.buyGutka(p);expect(p.profile.inventory?.gutka).toBe(2);expect(p.profile.coins).toBe(10);expect(saves).toHaveLength(2);p.profile.inventory!.gutka=30;room.buyGutka(p);expect(p.profile.coins).toBe(10);p.profile.inventory!.gutka=0;p.profile.coins=0;room.buyGutka(p);expect(p.profile.inventory?.gutka).toBe(0);});
 it('deducts once, blocks empty, double consume, early spit and vehicle entry',()=>{vi.useFakeTimers();vi.setSystemTime(10000);const {room,p,out}=setup();room.consumeGutka(p);expect(out.some(m=>m.t==='street.action')).toBe(false);room.buyGutka(p);room.consumeGutka(p);room.consumeGutka(p);room.spitGutka(p);expect(p.profile.inventory?.gutka).toBe(0);expect(p.profile.civic).toBe(100);expect(out.filter(m=>m.t==='street.action')).toHaveLength(1);vi.advanceTimersByTime(STREET.consumeMs);room.spitGutka(p);expect(p.profile.civic).toBe(99);room.spitGutka(p);expect(p.profile.civic).toBe(99);expect(out.filter(m=>m.t==='street.action')).toHaveLength(2);});
 it('prevents consumption in vehicles',()=>{const {room,p,out}=setup();room.buyGutka(p);p.vehicle='car';room.consumeGutka(p);expect(p.profile.inventory?.gutka).toBe(1);expect(out.some(m=>m.t==='street.action')).toBe(false);});
});
describe('contextual Hindi library',()=>{
 it('escalates repeated abuse, varies responses and de-escalates apologies',()=>{const a=streetReply('mild',undefined,10000,4,true);const b=streetReply('mild',a.mood,13000,4,true);expect(b.mood.leaving).toBe(true);const c=streetReply('apology',b.mood,16000,4,true);expect(c.mood.anger).toBe(1);expect(c.mood.leaving).toBe(false);expect(streetReply('funny',undefined,10000,4,true).reply).not.toBe(streetReply('funny',a.mood,13000,4,true).reply);});
 it('clean mode replaces stronger lines and anger decays after separation',()=>{const clean=streetReply('mild',undefined,10000,2,true);const strong=streetReply('mild',undefined,10000,2,false);expect(clean.player).not.toBe(strong.player);expect(streetReply('normal',strong.mood,50000,2,true).mood.anger).toBe(0);});
});
