"use client";
/** Procedural audio (WebAudio) — no external files: engine hum, horn, footsteps, UI blips, coin, and a soft ambient music bed. */
import { useStore } from "../state/store";

let ctx: AudioContext | null = null; let master: GainNode; let musicGain: GainNode; let engineOsc: OscillatorNode | null = null; let engineGain: GainNode | null = null; let engineFilter: BiquadFilterNode | null = null; let musicStarted = false;
function ac() { if (!ctx) { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); master = ctx.createGain(); master.connect(ctx.destination); musicGain = ctx.createGain(); musicGain.connect(master); } if (ctx.state === "suspended") ctx.resume(); return ctx; }
export function unlockAudio() { ac(); if (!musicStarted) startMusic(); }
function vol() { return useStore.getState().settings.sfx; }
function amb() { return useStore.getState().settings.ambience; }

function blip(freq: number, dur = 0.08, type: OscillatorType = "sine", gain = 0.2) {
  const c = ac(); const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = gain * vol(); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur); o.connect(g); g.connect(master); o.start(); o.stop(c.currentTime + dur);
}
export const sfx = {
  packet: () => { blip(1800, .08, "triangle", .06); setTimeout(() => blip(2200, .07, "triangle", .05), 90); },
  spit: () => blip(260, .12, "triangle", .07),
  ui: () => blip(880, 0.06), back: () => blip(440, 0.08), coin: () => { blip(1318, 0.1, "square", 0.12); setTimeout(() => blip(1760, 0.15, "square", 0.12), 80); },
  checkpoint: () => { blip(660, 0.1, "triangle"); setTimeout(() => blip(990, 0.15, "triangle"), 100); }, error: () => blip(160, 0.2, "sawtooth", 0.15),
  horn: () => { const c = ac(); const g = c.createGain(); g.gain.value = 0.25 * vol(); g.connect(master); for (const f of [392, 494]) { const o = c.createOscillator(); o.type = "square"; o.frequency.value = f; o.connect(g); o.start(); o.stop(c.currentTime + 0.4); } g.gain.setValueAtTime(0.25 * vol(), c.currentTime + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.45); },
  step: () => { const c = ac(); const b = c.createBuffer(1, 800, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3; const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = 0.08 * vol(); const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; s.connect(f); f.connect(g); g.connect(master); s.start(); },
  doorOpen: () => { blip(300, 0.12, "triangle", 0.15); setTimeout(() => blip(220, 0.15, "triangle", 0.12), 90); },
  camera: () => { blip(2400, 0.03, "square", 0.1); setTimeout(() => blip(1800, 0.05, "square", 0.08), 40); },
  trainHorn: () => { const c = ac(); const g = c.createGain(); g.gain.value = 0.3 * amb(); g.connect(master); for (const f of [220, 277, 330]) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; o.connect(lp); lp.connect(g); o.start(); o.stop(c.currentTime + 1.6); } g.gain.setValueAtTime(0.3 * amb(), c.currentTime + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.7); },
  crossingBell: () => { blip(1760, 0.25, "triangle", 0.12); setTimeout(() => blip(1760, 0.25, "triangle", 0.12), 500); },
  /** Engine voice per vehicle family: pitch rises with road speed (gear-like steps), volume with throttle load. */
  engine(on: boolean, speed = 0, cls: "car" | "two" | "three" | "heavy" | "pedal" | string = "car", voice: string = "std", load = 0) {
    if (!on && !engineOsc) return;
    if (on && cls === "pedal") { if (engineGain && ctx) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); return; }
    const c = ac();
    if (on && !engineOsc) { engineOsc = c.createOscillator(); engineGain = c.createGain(); engineFilter = c.createBiquadFilter(); engineFilter.type = "lowpass"; engineFilter.frequency.value = 400; engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master); engineGain.gain.value = 0; engineOsc.start(); }
    if (engineOsc && engineGain && engineFilter) {
      const p = ENGINE[voice] ?? ENGINE[cls] ?? ENGINE.car; engineOsc.type = p.type;
      const gearSpan = p.gear; const inGear = (speed % gearSpan) / gearSpan; const gear = Math.floor(speed / gearSpan);
      const f = p.base + (voice === "electric" ? speed * 28 : (inGear * p.rise + gear * p.rise * 0.18));
      engineOsc.frequency.setTargetAtTime(on ? f : p.base * 0.7, c.currentTime, 0.08); engineFilter.frequency.setTargetAtTime(p.cutoff * (1 + load * 0.8), c.currentTime, 0.1);
      engineGain.gain.setTargetAtTime(on ? (p.vol + Math.min(0.08, speed * 0.003) + load * p.vol) * Math.max(amb(), vol() * 0.6) : 0, c.currentTime, 0.15);
    }
    if (!on && engineOsc) { const o = engineOsc; engineOsc = null; engineFilter = null; setTimeout(() => { try { o.stop(); } catch { /* already */ } }, 500); }
  },
  shot() { const c = ac(); const n = Math.floor(c.sampleRate * 0.12); const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 4; const s2 = c.createBufferSource(); s2.buffer = b; const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 900; const g = c.createGain(); g.gain.value = 0.22 * vol(); s2.connect(f); f.connect(g); g.connect(master); s2.start(); blip(320, 0.05, "square", 0.08); },
  spray() { const c = ac(); const n = Math.floor(c.sampleRate * 0.45); const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.5; const s2 = c.createBufferSource(); s2.buffer = b; const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 4200; const g = c.createGain(); g.gain.value = 0.07 * vol(); s2.connect(f); f.connect(g); g.connect(master); s2.start(); },
  swing() { const c = ac(); const o = c.createOscillator(); const g = c.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(500, c.currentTime); o.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.16); g.gain.value = 0.05 * vol(); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18); o.connect(g); g.connect(master); o.start(); o.stop(c.currentTime + 0.2); },
  hit() { blip(140, 0.12, "triangle", 0.18); setTimeout(() => blip(90, 0.1, "sine", 0.12), 30); },
  crash(k = 0.5) { const c = ac(); const n = Math.floor(c.sampleRate * 0.35); const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2; const s2 = c.createBufferSource(); s2.buffer = b; const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 700 + k * 900; const g = c.createGain(); g.gain.value = (0.15 + k * 0.35) * vol(); s2.connect(f); f.connect(g); g.connect(master); s2.start(); blip(90, 0.25, "triangle", 0.2 * k); },
  skid(k = 0.5) { const c = ac(); const n = Math.floor(c.sampleRate * 0.28); const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / n) * Math.PI); const s2 = c.createBufferSource(); s2.buffer = b; const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = 3; const g = c.createGain(); g.gain.value = 0.06 * k * vol(); s2.connect(f); f.connect(g); g.connect(master); s2.start(); },
};
const ENGINE: Record<string, { type: OscillatorType; base: number; rise: number; gear: number; cutoff: number; vol: number }> = {
  car: { type: "sawtooth", base: 38, rise: 60, gear: 8, cutoff: 420, vol: 0.045 },
  std: { type: "sawtooth", base: 38, rise: 60, gear: 8, cutoff: 420, vol: 0.045 },
  two: { type: "square", base: 55, rise: 90, gear: 6, cutoff: 900, vol: 0.035 },
  thump: { type: "square", base: 28, rise: 40, gear: 8, cutoff: 260, vol: 0.06 },
  rev: { type: "sawtooth", base: 70, rise: 160, gear: 9, cutoff: 1500, vol: 0.04 },
  putt: { type: "square", base: 32, rise: 55, gear: 5, cutoff: 500, vol: 0.05 },
  three: { type: "square", base: 32, rise: 55, gear: 5, cutoff: 500, vol: 0.05 },
  electric: { type: "sine", base: 180, rise: 0, gear: 100, cutoff: 1800, vol: 0.018 },
  heavy: { type: "sawtooth", base: 24, rise: 30, gear: 5, cutoff: 260, vol: 0.07 },
};


/** Ambient bed: slow pentatonic arpeggio (raga Bhupali-ish: C D E G A) with a tanpura-like drone. Volume from settings.music. */
function startMusic() {
  musicStarted = true; const c = ac(); const notes = [261.6, 293.7, 329.6, 392, 440, 523.3];
  const drone = c.createOscillator(); drone.type = "triangle"; drone.frequency.value = 130.8; const dg = c.createGain(); dg.gain.value = 0.05; drone.connect(dg); dg.connect(musicGain); drone.start();
  const drone2 = c.createOscillator(); drone2.type = "sine"; drone2.frequency.value = 196; const dg2 = c.createGain(); dg2.gain.value = 0.03; drone2.connect(dg2); dg2.connect(musicGain); drone2.start();
  let i = 0; const step = () => { if (!ctx) return; const n = notes[(i * 3 + (i >> 2)) % notes.length] * (i % 7 === 0 ? 0.5 : 1); i++; const o = c.createOscillator(); o.type = "sine"; o.frequency.value = n; const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.6); o.connect(g); g.connect(musicGain); o.start(); o.stop(c.currentTime + 1.7); setTimeout(step, 900 + (i % 3) * 300); };
  step();
  const tick = () => { if(ctx) master.gain.setTargetAtTime(useStore.getState().settings.master,ctx.currentTime,.1); if (ctx) musicGain.gain.setTargetAtTime(useStore.getState().settings.music * (useStore.getState().paused ? 0.4 : 1), ctx.currentTime, 0.3); requestAnimationFrame(tick); }; tick();
}
