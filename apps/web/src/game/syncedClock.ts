const DAY = 86400;
const wrap = (s: number) => ((s % DAY) + DAY) % DAY;
/** Continuous visual clock, anchored to the local world-time samples from the solo runtime. */
export class SyncedClock {
  private seconds = 0; private stamp = 0; private ready = false;
  reset() { this.ready = false; }
  sync(dayFraction: number, nowMs: number, reset = false) {
    if (!Number.isFinite(dayFraction) || !Number.isFinite(nowMs)) return;
    const incoming = wrap(dayFraction * DAY), predicted = this.read(nowMs) * DAY;
    const error = ((incoming - predicted + DAY * 1.5) % DAY) - DAY / 2;
    this.seconds = !this.ready || reset || Math.abs(error) > 2 ? incoming : wrap(predicted + Math.max(-.005, Math.min(.005, error)));
    this.stamp = nowMs; this.ready = true;
  }
  read(nowMs: number) { return wrap(this.seconds + Math.max(0, Math.min(.5, (nowMs - this.stamp) / 1000))) / DAY; }
  get initialized() { return this.ready; }
}
export const visualClock = new SyncedClock();
export const renderWorldTime = { v: .3 };
