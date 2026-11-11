/** Client-local NPC simulation, deliberately separate from server-owned money/inventory. */
import { NPCS, STREET, STREET_LINES, streetReply, type StreetCategory, type NpcMood } from '@kanpurverse/shared';
import { npcPositions, playerPos } from './refs';
import { useStore } from '../state/store';
import { speak } from '../audio/voice';
export const streetRuntime = { moods: new Map<string, NpcMood>(), cleanliness: new Map<string, number>(), lastReaction: 0, stains: 0, impacts: 0 };
export function npcNear(id: string, radius = 4) { const def = NPCS.find(n => n.id === id); const p = npcPositions.get(id) ?? (def ? { x: def.path[0][0], z: def.path[0][1] } : undefined); return !!p && Math.hypot(p.x - playerPos.x, p.z - playerPos.z) <= radius; }
export function sayStreet(id: string, category: StreetCategory) {
 const s = useStore.getState(), now = performance.now(), old = streetRuntime.moods.get(id), def = NPCS.find(n => n.id === id);
 if (!def || !npcNear(id)) { s.set({ dialogue: undefined }); return; }
 if (old && now - old.lastAt < STREET.dialogueCooldownMs) { s.toast('अरे भाई, जवाब तो सुन लो!'); return; }
 const result = streetReply(category, old, now, def.appearanceSeed, s.settings.cleanLanguage);
 streetRuntime.moods.set(id, result.mood);
 s.toast(result.player);
 void speak({ id: `street.${id}.${category}.${result.mood.turn}`, npc: id, text: result.reply, category: 'social', emotion: result.mood.anger ? 'annoyed' : 'happy' }, id);
 if (result.mood.leaving) s.set({ dialogue: undefined });
 return result;
}
export function reactToSpit(x: number, z: number) {
 const now = performance.now(), s = useStore.getState(); const area = `${Math.floor(x / 40)},${Math.floor(z / 40)}`;
 const score = Math.max(0, (streetRuntime.cleanliness.get(area) ?? 100) - 2); streetRuntime.cleanliness.set(area, score);
 s.toast(`सड़क की सफ़ाई ${score}/100 · नागरिक स्कोर −${STREET.penalty}${score <= 94 ? ' · चेतावनी: सार्वजनिक जगह साफ़ रखें' : ''}`);
 if (now - streetRuntime.lastReaction < 4000) return;
 const nearest = NPCS.map(n => { const p = npcPositions.get(n.id) ?? { x: n.path[0][0], z: n.path[0][1] }; return { n, d: Math.hypot(x - p.x, z - p.z) }; }).filter(o => o.d < STREET.reactionRadius).sort((a,b) => a.d-b.d)[0];
 if (!nearest) return; streetRuntime.lastReaction = now;
 const old = streetRuntime.moods.get(nearest.n.id); streetRuntime.moods.set(nearest.n.id, { anger: Math.min(4,(old?.anger ?? 0)+1), turn: old?.turn ?? 0, lastAt: now, until: now + STREET.reactionMs, leaving: false });
 const text = nearest.n.role === 'police' ? 'सार्वजनिक जगह साफ़ रखिए। दोबारा किया तो चेतावनी मिलेगी।' : ['अरे गुरु, सड़क है, पीकदान नहीं!', 'भैया, शहर अपना है। गंदा मत करो!', 'ये क्या कर रहे हो? सफ़ाई वाले की मेहनत समझो!'][nearest.n.appearanceSeed % 3];
 void speak({ id:'street.spit', npc:nearest.n.id, text, category:'reaction', emotion:'annoyed' }, nearest.n.id);
}
export { STREET_LINES };
