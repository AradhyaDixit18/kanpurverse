"use client";
import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { LANDMARKS, SPAWN_POINT } from "@kanpurverse/shared";
import { OsmCity, useGeo } from "../../../src/game/OsmCity";
import { GroundCollider } from "../../../src/game/GroundCollider";
import { WorldClock } from "../../../src/game/WorldClock";
import { Sky } from "../../../src/game/Sky";
import { StoryWorld } from "../../../src/game/StoryWorld";
import { Boulevard } from "../../../src/game/Boulevard";
import { Props } from "../../../src/game/Props";
import { NPCs } from "../../../src/game/NPCs";
import { Traffic } from "../../../src/game/Traffic";
import { Animals } from "../../../src/game/Animals";
import { VehicleMesh } from "../../../src/game/Vehicles";
import { FrameProbe } from "../../../src/game/qa/FrameProbe";
import { ReviewControls } from "../../../src/game/qa/ReviewControls";
import { playerPos as livePlayerPos } from "../../../src/game/Player";
import { playerPos } from "../../../src/game/refs";
import { useStore } from "../../../src/state/store";
type View = { name: string; x: number; z: number };
function Viewpoint({ view }: { view: View }) { const { camera } = useThree(); useEffect(() => { playerPos.set(view.x, 0, view.z); livePlayerPos.set(view.x,0,view.z); camera.position.set(view.x + (view.name.includes("Kanpur") ? 80 : -10), view.name.includes("Kanpur") ? 35 : 9, view.z + (view.name.includes("Kanpur") ? 90 : -16)); camera.lookAt(view.x, 3, view.z); }, [view, camera]); return <OrbitControls target={[view.x, 3, view.z]} />; }
export default function WorldReview() {
  const geo = useGeo(); const [view, setView] = useState<View>({ name: "Mall Road spawn", x: SPAWN_POINT[0], z: SPAWN_POINT[2] });
  useEffect(() => { useStore.getState().set({ worldTime: .45 }); }, []);
  if (!geo) return <p>Loading existing OSM scene…</p>;
  const views: View[] = [{ name: "Mall Road spawn", x: SPAWN_POINT[0], z: SPAWN_POINT[2] }, ...geo.stations.filter((s,i,a) => /^Kanpur/.test(s.name ?? "") && a.findIndex(t=>t.name===s.name)===i).map(s => ({ name: s.name ?? "Station", x: s.p[0], z: s.p[1] })), {name:"Sunehri Mithai",x:489,z:-306}, ...LANDMARKS.map(l => ({ name:l.name, x:l.p[0], z:l.p[1] })), ...geo.pois.filter(p => /Naveen|Moti|Phool|Green Park|Square|Temple/i.test(p.name)).map(p => ({ name: p.name, x: p.p[0], z: p.p[1] })), ...geo.crossings.filter(c => c.kind === "level_crossing").slice(0, 2).map((c, i) => ({ name: `OSM crossing ${i + 1}`, x: c.p[0], z: c.p[1] }))];
  return <><Canvas shadows camera={{ fov: 60, far: 900 }} dpr={1.25} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}><Suspense fallback={null}><Physics timeStep={1 / 60}><GroundCollider /><WorldClock /><Sky /><Environment files="/hdr/kloofendal_48d_partly_cloudy_puresky.hdr" environmentIntensity={.6} /><OsmCity geo={geo} /><Props /><StoryWorld /><Boulevard /><NPCs /><Traffic /><Animals /><group position={[SPAWN_POINT[0] + 4, .775, SPAWN_POINT[2]]}><VehicleMesh kind="hatchback" color={0x2d695b} /></group></Physics><Viewpoint view={view} /><FrameProbe /></Suspense></Canvas><div style={{ position: "fixed", top: 12, left: 12, background: "#101b24ef", padding: 12, color: "white", maxWidth: 500 }}><b>Existing world visual review · development only</b><p>Daylight inspection, original map coordinates. Camera visit is not a gameplay/teleport test.</p><label>View <select value={view.name} onChange={e => setView(views.find(v => v.name === e.target.value)!)}>{views.map((v,i) => <option key={i}>{v.name}</option>)}</select></label><label>Graphics <select value={useStore.getState().settings.quality} onChange={e=>useStore.getState().setSettings({quality:e.target.value as never})}><option>low</option><option>medium</option><option>high</option><option>ultra</option></select></label><button onClick={()=>useStore.getState().set({worldTime:.45})}>Day</button><button onClick={()=>useStore.getState().set({worldTime:.745})}>Sunset</button><button onClick={()=>useStore.getState().set({worldTime:.88})}>Night</button><p>{view.x.toFixed(1)}, {view.z.toFixed(1)} · drag to orbit / wheel to zoom</p></div><ReviewControls /></>;
}
