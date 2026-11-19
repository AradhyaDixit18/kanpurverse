"use client";
/**
 * Cinematic capture rig. Dormant unless the page is opened with `?capture=1`; then it installs `window.__kvCine`:
 *
 *   __kvCine.state()                      position, heading, speed, vehicle, canvas size, active shot
 *   __kvCine.shot("low_wheel", 1)         select a capture camera (see cinematics.ts); shot(null) returns to the game camera
 *   __kvCine.frame(1080, 1920)            render the game natively at that size (portrait reel); frame(null) restores
 *   __kvCine.record({ seconds, name })    record the canvas (60 fps) and save it as a file
 *   __kvCine.routeTo(x, z); __kvCine.drive(35)   road-following autopilot at 35 km/h; drive(0) stops
 *   __kvCine.place(x, z, yaw)             put the driven vehicle at a shot's start position
 *   __kvCine.settings({ atmosphere: "sunset", quality: "ultra" })
 *
 * Capture cameras are separate from the gameplay camera: a shot is applied after the gameplay camera each frame and
 * never writes to its yaw, pitch, distance or mode, so releasing the shot hands back exactly the view the player had.
 * The autopilot steers through the analogue touch-joystick input, so the keyboard still overrides it at any time.
 */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useBeforePhysicsStep } from "@react-three/rapier";
import * as THREE from "three";
import { VEHICLE_SPECS } from "@kanpurverse/shared";
import { useStore } from "../../state/store";
import { input } from "../input";
import { playerPos, playerYaw, drivenRender, vehicleTelemetry } from "../refs";
import { getRoads } from "../roads";
import { buildRoadGraph, route, type RoadGraph } from "../gps";
import { vehicleCorrections } from "../../net/client";
import { shotFrame, pursue, SHOTS, type Shot, type ShotName, type Subject } from "../cinematics";

export const captureEnabled = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("capture") === "1";
const wrap = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const MIME = ["video/mp4;codecs=avc1.640033", "video/mp4;codecs=avc1.42E01F", "video/mp4", "video/webm;codecs=vp9", "video/webm"];

export function CinematicRig() {
  const { camera, gl } = useThree();
  const S = useRef({ on: false, shot: null as Shot | null, t: 0, yaw: 0, fov: 60, auto: null as null | { pts: [number, number][]; speed: number; index: number }, lastRoute: [] as [number, number][], graph: null as RoadGraph | null,
    framed: null as null | { w: number; h: number; el: HTMLElement; css: string }, recording: false, tick: 0 });

  const subject = (yaw: number): Subject => {
    const s = useStore.getState(); const id = s.inVehicle; const v = id ? s.vehicles[id] : undefined;
    if (v && drivenRender.id === id) { const sp = VEHICLE_SPECS[v.kind]; return { x: drivenRender.x, y: drivenRender.y, z: drivenRender.z, yaw, w: sp.size[0], h: sp.size[1], l: sp.size[2], wheelBase: sp.wheelBase, wheelR: sp.wheelR }; }
    return { x: playerPos.x, y: playerPos.y + 0.9, z: playerPos.z, yaw, w: 0.5, h: 1.8, l: 0.5, wheelBase: 0.4, wheelR: 0.1 };
  };

  useEffect(() => {
    if (!captureEnabled()) return; const st = S.current; st.on = true; st.yaw = playerYaw.v;
    const applyFrame = () => { const f = st.framed; if (!f) return; const dpr = gl.getPixelRatio(); f.el.style.cssText = `${f.css};inset:auto;left:0;top:0;right:auto;bottom:auto;width:${f.w / dpr}px;height:${f.h / dpr}px`; };
    const api = {
      version: 1, shots: SHOTS,
      state: () => { const s = useStore.getState(); const v = s.inVehicle ? s.vehicles[s.inVehicle] : undefined; return { x: playerPos.x, y: playerPos.y, z: playerPos.z, yaw: playerYaw.v, kmh: Math.round(vehicleTelemetry.speed * 3.6 * 10) / 10, reverse: vehicleTelemetry.reverse, inVehicle: s.inVehicle ?? null, vehicle: v?.kind ?? null, shot: st.shot?.name ?? null, autopilot: !!st.auto, fps: s.fps, canvas: [gl.domElement.width, gl.domElement.height], dpr: gl.getPixelRatio(), recording: st.recording, quality: s.settings.quality, atmosphere: s.settings.atmosphere }; },
      shot: (name: ShotName | null, side: 1 | -1 = 1) => { if (name && !SHOTS.includes(name)) throw new Error(`unknown shot: ${name}`); st.yaw = playerYaw.v; st.t = 0; st.shot = name ? { name, side: side < 0 ? -1 : 1, anchor: subject(playerYaw.v) } : null; return st.shot?.name ?? null; },
      frame: (w: number | null = 1080, h = 1920) => { if (st.framed) { st.framed.el.style.cssText = st.framed.css; st.framed = null; } if (w) { const el = (gl.domElement.parentElement?.parentElement ?? gl.domElement.parentElement) as HTMLElement | null; if (!el) return null; st.framed = { w, h, el, css: el.style.cssText }; applyFrame(); } return st.framed ? [st.framed.w, st.framed.h] : null; },
      record: ({ seconds = 6, fps = 60, mbps = 16, name = `kv_${Date.now()}` }: { seconds?: number; fps?: number; mbps?: number; name?: string } = {}) => new Promise<{ name: string; type: string; bytes: number; seconds: number }>((resolve, reject) => {
        if (st.recording) return reject(new Error("already recording")); const type = MIME.find(m => MediaRecorder.isTypeSupported(m)); if (!type) return reject(new Error("no supported recording format"));
        const stream = gl.domElement.captureStream(fps); const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: mbps * 1e6 }); const chunks: BlobPart[] = []; st.recording = true;
        rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        rec.onerror = () => { st.recording = false; stream.getTracks().forEach(t => t.stop()); reject(new Error("recording failed")); };
        rec.onstop = () => { st.recording = false; stream.getTracks().forEach(t => t.stop()); const blob = new Blob(chunks, { type }); const file = `${name}.${type.startsWith("video/mp4") ? "mp4" : "webm"}`;
          const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = file; a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000); resolve({ name: file, type, bytes: blob.size, seconds }); };
        rec.start(250); setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, seconds * 1000);
      }),
      routeTo: (x: number, z: number) => { st.graph ??= buildRoadGraph(getRoads()); const r = route(st.graph, [playerPos.x, playerPos.z], [x, z]); st.lastRoute = r.ok ? r.pts : []; return { ok: r.ok, length: Math.round(r.length), points: r.pts.length }; },
      drive: (kmh = 35, pts?: [number, number][]) => { const path = pts ?? st.lastRoute; if (!kmh || path.length < 2) { st.auto = null; input.touch.joy.x = 0; input.touch.joy.y = 0; return false; } st.auto = { pts: path, speed: kmh / 3.6, index: 0 }; return true; },
      place: (x: number, z: number, yaw = playerYaw.v) => { const s = useStore.getState(); const id = s.inVehicle; const v = id ? s.vehicles[id] : undefined; if (!id || !v) return false; vehicleCorrections.set(id, { ...v, p: [x, VEHICLE_SPECS[v.kind].size[1] / 2 + 0.3, z], q: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], v: 0 }); return true; },
      settings: (patch: Parameters<ReturnType<typeof useStore.getState>["setSettings"]>[0]) => { useStore.getState().setSettings(patch); return useStore.getState().settings; },
      _applyFrame: applyFrame,
    };
    (window as unknown as { __kvCine?: unknown }).__kvCine = api;
    return () => { api.frame(null); api.drive(0); st.on = false; st.shot = null; delete (window as unknown as { __kvCine?: unknown }).__kvCine; };
  }, [gl]);

  // Autopilot: one steering and throttle decision per fixed physics step, through the touch-joystick path.
  useBeforePhysicsStep(() => {
    const st = S.current; const a = st.auto; if (!st.on || !a) return;
    if (!useStore.getState().inVehicle) { st.auto = null; input.touch.joy.x = 0; input.touch.joy.y = 0; return; }
    const p = pursue(a.pts, playerPos.x, playerPos.z, playerYaw.v, vehicleTelemetry.speed * (vehicleTelemetry.reverse ? -1 : 1), a.speed, a.index); a.index = p.index;
    input.touch.joy.x = p.steer; input.touch.joy.y = -p.throttle; if (p.done) { st.auto = null; input.touch.joy.x = 0; input.touch.joy.y = 0; }
  });

  // Capture camera: runs after the gameplay camera (this component mounts after <Player/>), so it only overrides the
  // final view for this frame.
  useFrame((_, dtRaw) => {
    const st = S.current; if (!st.on) return; const cam = camera as THREE.PerspectiveCamera;
    if (st.framed && ++st.tick % 30 === 0 && (gl.domElement.width !== st.framed.w || gl.domElement.height !== st.framed.h)) { const dpr = gl.getPixelRatio(); const f = st.framed; f.el.style.width = `${f.w / dpr}px`; f.el.style.height = `${f.h / dpr}px`; } // adaptive resolution changed the pixel ratio
    if (!st.shot) { if (st.fov !== 60) { st.fov = 60; cam.fov = 60; cam.updateProjectionMatrix(); } return; }
    const dt = Math.min(dtRaw, 0.1); st.t += dt; st.yaw += wrap(playerYaw.v - st.yaw) * (1 - Math.exp(-dt * 8)); // heading eased so a rigid camera does not show 60 Hz yaw steps
    const f = shotFrame(st.shot, subject(st.yaw), st.t); cam.position.set(f.pos[0], f.pos[1], f.pos[2]); cam.lookAt(f.look[0], f.look[1], f.look[2]);
    if (Math.abs(cam.fov - f.fov) > 0.01 || st.fov !== f.fov) { st.fov = f.fov; cam.fov = f.fov; cam.updateProjectionMatrix(); }
  });
  return null;
}
