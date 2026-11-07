"use client";
/** Procedural audio (WebAudio) — no external files: engine hum, horn, footsteps, UI blips, coin, and a soft ambient music bed. */
import { useStore } from "../state/store";

let ctx: AudioContext | null = null; let master: GainNode; let musicGain: GainNode; let engineOsc: OscillatorNode | null = null; let engineGain: GainNode | null = null; let musicStarted = false;
function ac() { if (!ctx) { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); master = ctx.createGain(); master.connect(ctx.destination); musicGain = ctx.createGain(); musicGain.connect(master); } if (ctx.state === "suspended") ctx.resume(); return ctx; }
export function unlockAudio() { ac(); if (!musicStarted) startMusic(); }
function vol() { return useStore.getState().settings.sfx; }
function amb() { return useStore.getState().settings.ambience; }

function blip(freq: number, dur = 0.08, type: OscillatorType = "sine", gain = 0.2) {
  const c = ac(); const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = gain * vol(); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur); o.connect(g); g.connect(master); o.start(); o.stop(c.currentTime + dur);
}
export const sfx = {
  ui: () => blip(880, 0.06), back: () => blip(440, 0.08), coin: () => { blip(1318, 0.1, "square", 0.12); setTimeout(() => blip(1760, 0.15, "square", 0.12), 80); },
  checkpoint: () => { blip(660, 0.1, "triangle"); setTimeout(() => blip(990, 0.15, "triangle"), 100); }, error: () => blip(160, 0.2, "sawtooth", 0.15),
  horn: () => { const c = ac(); const g = c.createGain(); g.gain.value = 0.25 * vol(); g.connect(master); for (const f of [392, 494]) { const o = c.createOscillator(); o.type = "square"; o.frequency.value = f; o.connect(g); o.start(); o.stop(c.currentTime + 0.4); } g.gain.setValueAtTime(0.25 * vol(), c.currentTime + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.45); },
  step: () => { const c = ac(); const b = c.createBuffer(1, 800, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3; const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = 0.08 * vol(); const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; s.connect(f); f.connect(g); g.connect(master); s.start(); },
  doorOpen: () => { blip(300, 0.12, "triangle", 0.15); setTimeout(() => blip(220, 0.15, "triangle", 0.12), 90); },
  camera: () => { blip(2400, 0.03, "square", 0.1); setTimeout(() => blip(1800, 0.05, "square", 0.08), 40); },
  engine(on: boolean, speed = 0) {
    if (!on && !engineOsc) return;
    const c = ac();
    if (on && !engineOsc) { engineOsc = c.createOscillator(); engineGain = c.createGain(); engineOsc.type = "sawtooth"; const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 400; engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master); engineGain.gain.value = 0; engineOsc.start(); }
    if (engineOsc && engineGain) { engineOsc.frequency.setTargetAtTime(on ? 40 + speed * 4 : 30, c.currentTime, 0.1); engineGain.gain.setTargetAtTime(on ? (0.05 + Math.min(0.1, speed * 0.004)) * amb() : 0, c.currentTime, 0.15); }
    if (!on && engineOsc) { const o = engineOsc; engineOsc = null; setTimeout(() => { try { o.stop(); } catch { /* already */ } }, 500); }
  },
};

/** Ambient bed: slow pentatonic arpeggio (raga Bhupali-ish: C D E G A) with a tanpura-like drone. Volume from settings.music. */
function startMusic() {
  musicStarted = true; const c = ac(); const notes = [261.6, 293.7, 329.6, 392, 440, 523.3];
  const drone = c.createOscillator(); drone.type = "triangle"; drone.frequency.value = 130.8; const dg = c.createGain(); dg.gain.value = 0.05; drone.connect(dg); dg.connect(musicGain); drone.start();
  const drone2 = c.createOscillator(); drone2.type = "sine"; drone2.frequency.value = 196; const dg2 = c.createGain(); dg2.gain.value = 0.03; drone2.connect(dg2); dg2.connect(musicGain); drone2.start();
  let i = 0; const step = () => { if (!ctx) return; const n = notes[(i * 3 + (i >> 2)) % notes.length] * (i % 7 === 0 ? 0.5 : 1); i++; const o = c.createOscillator(); o.type = "sine"; o.frequency.value = n; const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.6); o.connect(g); g.connect(musicGain); o.start(); o.stop(c.currentTime + 1.7); setTimeout(step, 900 + (i % 3) * 300); };
  step();
  const tick = () => { if (ctx) musicGain.gain.setTargetAtTime(useStore.getState().settings.music * (useStore.getState().paused ? 0.4 : 1), ctx.currentTime, 0.3); requestAnimationFrame(tick); }; tick();
}
