export interface FrameSample { ms: number; calls: number; triangles: number }
/** Frame intervals include long stalls; no FPS averaging or outlier trimming. */
export function summarizeFrames(samples: FrameSample[]) {
  const valid = samples.filter(s => Number.isFinite(s.ms) && s.ms > 0);
  const sorted = valid.map(s => s.ms).sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
  const durationMs = valid.reduce((a, s) => a + s.ms, 0);
  return { frames: valid.length, durationMs, averageFps: durationMs ? valid.length * 1000 / durationMs : 0, p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99), maxMs: sorted.at(-1) ?? 0, over33Ms: valid.filter(s => s.ms > 33.34).length, meanCalls: valid.length ? valid.reduce((a, s) => a + s.calls, 0) / valid.length : 0, meanTriangles: valid.length ? valid.reduce((a, s) => a + s.triangles, 0) / valid.length : 0 };
}
