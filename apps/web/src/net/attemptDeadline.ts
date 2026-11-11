/** A silent CONNECTING socket must not hold the loading screen indefinitely. */
export class AttemptDeadline {
  private timer?: ReturnType<typeof setTimeout>;
  arm(ms: number, expire: () => void) { this.clear(); this.timer = setTimeout(() => { this.timer = undefined; expire(); }, ms); }
  clear() { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }
}
