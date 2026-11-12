import { describe, it, expect } from 'vitest';
import { streetReply } from '../packages/shared/src';
describe('contextual Hindi library',()=>{
 it('escalates repeated abuse, varies responses and de-escalates apologies',()=>{const a=streetReply('mild',undefined,10000,4,true);const b=streetReply('mild',a.mood,13000,4,true);expect(b.mood.leaving).toBe(true);const c=streetReply('apology',b.mood,16000,4,true);expect(c.mood.anger).toBe(1);expect(c.mood.leaving).toBe(false);expect(streetReply('funny',undefined,10000,4,true).reply).not.toBe(streetReply('funny',a.mood,13000,4,true).reply);});
 it('clean mode replaces stronger lines and anger decays after separation',()=>{const clean=streetReply('mild',undefined,10000,2,true);const strong=streetReply('mild',undefined,10000,2,false);expect(clean.player).not.toBe(strong.player);expect(streetReply('normal',strong.mood,50000,2,true).mood.anger).toBe(0);});
});
