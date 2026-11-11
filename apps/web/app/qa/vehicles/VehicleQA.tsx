"use client";
/** Development-only integration controls operating the real network, player and vehicle controllers. */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useStore } from "../../../src/state/store";
import { net } from "../../../src/net/client";
import { playerPhysicsTelemetry } from "../../../src/game/refs";
import { input, touchPress, camYaw } from "../../../src/game/input";
import { VEHICLE_QA_ROOM } from "../../../../../packages/shared/src/vehicleQaFixture";
const Game = dynamic(() => import("../../../src/game/Game").then(m => m.Game), { ssr: false });
export default function VehicleQA() {
  const s = useStore(); const [name, setName] = useState("QA_Driver"); const [enclosed, setEnclosed] = useState(false);
  useEffect(() => () => { input.touch.joy.y = 0; input.touch.jump = false; }, []);
  const car = Object.values(s.vehicles)[0];
  function drive(steer = 0) { input.touch.jump = false; input.touch.joy.x = steer; input.touch.joy.y = -1; setTimeout(() => { input.touch.joy.x = 0; input.touch.joy.y = 0; }, 2000); }
  function brake() { input.touch.joy.x = 0; input.touch.joy.y = 0; input.touch.jump = true; setTimeout(() => { input.touch.jump = false; }, 1500); }
  return <>
    {s.connected && <Game qaScenario="vehicles" />}
    <section style={{ position: "fixed", top: 12, left: 12, zIndex: 100, padding: 14, background: "#10151dee", color: "white", maxWidth: 390, borderRadius: 10, font: "14px system-ui" }}>
      <strong>Local vehicle integration fixture</strong><p>Real controllers + isolated server. This is not the city playthrough.</p>
      {!s.connected ? <><input aria-label="QA player name" value={name} onChange={e => setName(e.target.value)} /><button onClick={() => { s.set({ name, token: undefined, paused: false, screen: "loading" }); s.setSettings({ lang: "english", quality: "low", voice: false, music: 0 }); net.connect(VEHICLE_QA_ROOM); }}>Connect</button></> : <>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button onClick={() => car && net.send({ t: "vehicle.enter", id: car.id, seat: "driver" })}>Enter driver</button>
          <button onClick={() => car && net.send({ t: "vehicle.enter", id: car.id, seat: "passenger" })}>Enter passenger</button>
          <button onClick={() => drive()}>Drive 2 seconds</button><button onClick={() => drive(0.5)}>Drive and turn</button><button onClick={brake}>Brake</button>
          <button onClick={() => touchPress("KeyF")}>Exit safely</button>
          <button onClick={() => { camYaw.v = -Math.PI / 2; camYaw.pitch = 0.14; camYaw.dist = 7; }}>Side camera</button>
          <button onClick={() => { camYaw.v = -0.85; camYaw.pitch = 0.18; camYaw.dist = 6; }}>Front camera</button>
          <button aria-pressed={enclosed} onClick={() => { setEnclosed(!enclosed); window.dispatchEvent(new CustomEvent("kv:qa:enclose", { detail: !enclosed })); }}>Toggle enclosure</button>
          <button onClick={() => window.dispatchEvent(new Event("kv:qa:capture"))}>Save frame</button>
          <button onClick={() => window.dispatchEvent(new Event("kv:qa:record"))}>Record 5 seconds</button>
        </div>
        <p role="status">{Object.keys(s.players).length} online · {s.seat ?? "on foot"} · {s.vehicleTransition ?? "ready"} · {s.fps} FPS · {s.ping} ms</p>
        <p>Physics: {JSON.stringify(playerPhysicsTelemetry)}</p><p>Driver: {car?.driver ? s.players[car.driver]?.name ?? "claimed" : "empty"} · Passenger: {car?.passenger ? s.players[car.passenger]?.name ?? "claimed" : "empty"}</p>
        <p>Vehicle: {car?.p.map(v => v.toFixed(2)).join(", ")} · {car?.v.toFixed(2)} m/s · q {car?.q.map(v => v.toFixed(3)).join(", ")}</p>
        <p>Self: {s.selfId ? s.players[s.selfId]?.p.map(v => v.toFixed(2)).join(", ") : "joining"}</p>
        {s.toasts.slice(-2).map(t => <p key={t.id}>{t.text}</p>)}
      </>}
    </section>
  </>;
}
