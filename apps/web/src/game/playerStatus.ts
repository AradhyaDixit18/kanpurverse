/**
 * Player status rules (pure + one runtime record). Stamina gates sprinting; falls and crashes hurt; at zero health the
 * player is knocked out and wakes at City Hospital. The live stamina value is mutated here every physics tick and
 * mirrored to the store four times a second, so React never re-renders per frame.
 */
export const STAMINA = { sprintDrain: 16, regen: 14, regenDelay: 0.8, exhaustedUntil: 25 };
export const FALL = { safeSpeed: 11, perMs: 7, max: 60 };
export const runtime = { stamina: 100, exhausted: false, sinceSprint: 99, lastHit: 0, invulnerableUntil: 0 };

export function stepStamina(st: { stamina: number; exhausted: boolean; sinceSprint: number }, wantsSprint: boolean, moving: boolean, dt: number) {
  const sprinting = wantsSprint && moving && !st.exhausted && st.stamina > 0;
  const sinceSprint = sprinting ? 0 : st.sinceSprint + dt; let stamina = st.stamina, exhausted = st.exhausted;
  if (sprinting) stamina = Math.max(0, stamina - STAMINA.sprintDrain * dt);
  else if (sinceSprint > STAMINA.regenDelay) stamina = Math.min(100, stamina + STAMINA.regen * dt * (moving ? 0.6 : 1));
  if (stamina <= 0) exhausted = true; if (exhausted && stamina >= STAMINA.exhaustedUntil) exhausted = false;
  return { stamina, exhausted, sinceSprint, sprinting };
}
/** Damage from landing at `impactSpeed` m/s (downward). */
export const fallDamage = (impactSpeed: number) => impactSpeed <= FALL.safeSpeed ? 0 : Math.min(FALL.max, Math.round((impactSpeed - FALL.safeSpeed) * FALL.perMs));
/** Damage to the driver from a crash that removed `impact` m/s in one tick (seat belts: gentle). */
export const crashDamage = (impact: number) => impact < 9 ? 0 : Math.min(35, Math.round((impact - 9) * 2.5));
