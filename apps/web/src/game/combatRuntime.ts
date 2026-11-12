/**
 * Combat and damage authority (single source): player damage, knock-out/respawn, enemy registry, weapon use.
 * Everything is fictional and non-graphic: enemies are "knocked out" (बेहोश), never killed; no blood.
 */
import * as THREE from "three";
import { item, knockoutBill, type WeaponDef } from "@kanpurverse/shared";
import { useStore, tl } from "../state/store";
import { runtime } from "./playerStatus";
import { sfx } from "../audio/sfx";

export interface EnemyState { id: string; mission: string; pos: THREE.Vector3; health: number; stunUntil: number; knockedAt: number; hitAt: number; attackAt: number }
export const enemies = new Map<string, EnemyState>();

/** Hurt the player. Short invulnerability prevents one hazard from applying many times in one moment. */
export function hurtPlayer(amount: number, cause: "fall" | "crash" | "enemy") {
  if (amount <= 0) return; const s = useStore.getState(); const now = performance.now();
  if (s.dead || now < runtime.invulnerableUntil) return; runtime.invulnerableUntil = now + (cause === "enemy" ? 350 : 800); runtime.lastHit = now;
  const health = Math.max(0, s.health - amount); s.set({ health });
  s.toast(tl(cause === "fall" ? `गिर गईं! −${amount} सेहत` : cause === "crash" ? `टक्कर! −${amount} सेहत` : `चोट लगी −${amount}`, cause === "fall" ? `Fall −${amount} health` : cause === "crash" ? `Crash −${amount} health` : `Hit −${amount}`), "error");
  window.dispatchEvent(new CustomEvent("kv:hurt", { detail: amount }));
  if (health <= 0) knockOut();
}
/** Health reached zero: screen fades, mission fails, player wakes at City Hospital after a short delay. */
export function knockOut() {
  const s = useStore.getState(); if (s.dead) return; const bill = knockoutBill(s.profile?.coins ?? 0);
  s.set({ dead: { at: Date.now(), bill }, inVehicle: undefined, seat: undefined });
  if (s.mission) s.set({ mission: undefined, missionResult: { id: s.mission.def.id, success: false, coins: 0, xp: 0 } });
  setTimeout(() => window.dispatchEvent(new CustomEvent("kv:respawn")), 4200);
}

export function equippedWeapon(): { id?: string; def?: WeaponDef } { const id = useStore.getState().game.equipped; return { id, def: id ? item(id)?.weapon : undefined }; }
/** Cycle unarmed → owned weapons (T). */
export function cycleWeapon() {
  const s = useStore.getState(); const list = [undefined, ...s.game.weapons]; const i = list.indexOf(s.game.equipped); const next = list[(i + 1) % list.length];
  s.set({ game: { ...s.game, equipped: next } }); const it = next ? item(next) : undefined; sfx.ui();
  s.toast(it ? tl(`हाथ में: ${it.nameHi}`, `Equipped: ${it.name}`) : tl("खाली हाथ", "Unarmed"));
}
/** Reload the equipped weapon from carried ammunition (R on foot). Atomic within the store update. */
export function reload() {
  const s = useStore.getState(); const { id, def } = equippedWeapon(); if (!id || !def?.clip || !def.ammo) return false;
  const have = s.game.items[def.ammo] ?? 0, inClip = s.game.clip[id] ?? 0, need = def.clip - inClip; if (need <= 0 || have <= 0) { if (have <= 0) s.toast(tl("गोली-बारूद खतम। शेरा स्पोर्ट्स से लीजिए।", "Out of ammo. Buy more at Shera Sports."), "error"); return false; }
  const take = Math.min(need, have); const items = { ...s.game.items, [def.ammo]: have - take }; if (!items[def.ammo]) delete items[def.ammo];
  s.set({ game: { ...s.game, items, clip: { ...s.game.clip, [id]: inClip + take } } }); sfx.ui(); return true;
}

const _f = new THREE.Vector3(), _d = new THREE.Vector3();
/**
 * Resolve one attack. `origin`/`dir` are the player's position and facing (melee) or the camera ray (ranged).
 * `blocked(dist)` lets the caller veto ranged hits hidden behind walls. Returns ids that were hit.
 */
export function attack(origin: THREE.Vector3, dir: THREE.Vector3, blocked?: (target: THREE.Vector3) => boolean): string[] {
  const s = useStore.getState(); const { id, def } = equippedWeapon(); const now = performance.now();
  const w: WeaponDef = def ?? { cls: "melee", damage: 9, range: 1.5, cooldown: 0.6 };
  if (now - lastAttack < w.cooldown * 1000) return []; lastAttack = now;
  if (id && w.clip) { const left = s.game.clip[id] ?? 0; if (left <= 0) { if (!reload()) { sfx.error(); return []; } return []; } s.set({ game: { ...s.game, clip: { ...s.game.clip, [id]: left - 1 } } }); }
  window.dispatchEvent(new CustomEvent("kv:attack", { detail: { cls: w.cls, id } }));
  if (w.cls === "ranged") sfx.shot(); else if (w.stun && w.damage === 0) sfx.spray(); else sfx.swing();
  const hits: string[] = []; _f.copy(dir).setY(w.cls === "ranged" ? dir.y : 0).normalize();
  for (const e of enemies.values()) {
    if (e.knockedAt) continue; _d.copy(e.pos).sub(origin); const dist = _d.length(); if (dist > w.range) continue;
    if (w.cls === "ranged") { const along = _d.dot(_f); if (along < 0) continue; const miss = Math.sqrt(Math.max(0, dist * dist - along * along)); if (miss > 0.7 || blocked?.(e.pos)) continue; }
    else { _d.y = 0; if (_d.normalize().dot(_f) < (w.cls === "nonlethal" && w.damage === 0 ? 0.6 : 0.35)) continue; }
    hits.push(e.id); e.hitAt = now; if (w.stun) e.stunUntil = now + w.stun * 1000;
    e.health = Math.max(0, e.health - w.damage); if (w.damage > 0) sfx.hit();
    if (e.health <= 0 && !e.knockedAt) { e.knockedAt = now; const g = useStore.getState().game; useStore.getState().set({ game: { ...g, stats: { ...g.stats, knockouts: g.stats.knockouts + 1 } } }); }
    if (w.cls === "ranged") break;
  }
  return hits;
}
let lastAttack = -Infinity;
export function resetCombat() { lastAttack = -Infinity; enemies.clear(); }
