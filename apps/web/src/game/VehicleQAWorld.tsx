"use client";
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { VEHICLE_QA_WALL as w } from "../../../../packages/shared/src/vehicleQaFixture";
import { SPAWN_POINT } from "@kanpurverse/shared";
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
export function VehicleQAWorld() {
  const [enclosed, setEnclosed] = useState(false);
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const capture = () => { gl.render(scene, camera); gl.domElement.toBlob(blob => { if (blob) download(blob, `kanpurverse-frame-${Date.now()}.png`); }); };
    const record = () => {
      const stream = gl.domElement.captureStream(30); const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); download(new Blob(chunks, { type: "video/webm" }), `kanpurverse-recording-${Date.now()}.webm`); };
      recorder.start(); setTimeout(() => recorder.stop(), 5000);
    };
    const enclose = (event: Event) => setEnclosed((event as CustomEvent<boolean>).detail);
    window.addEventListener("kv:qa:enclose", enclose);
    window.addEventListener("kv:qa:capture", capture); window.addEventListener("kv:qa:record", record);
    return () => { window.removeEventListener("kv:qa:enclose", enclose); window.removeEventListener("kv:qa:capture", capture); window.removeEventListener("kv:qa:record", record); };
  }, [gl, scene, camera]);
  return <>
    <color attach="background" args={["#b8d1e0"]} /><ambientLight intensity={1.5} /><directionalLight position={[SPAWN_POINT[0] - 8, 15, SPAWN_POINT[2] + 8]} intensity={2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SPAWN_POINT[0], -0.001, SPAWN_POINT[2]]}><planeGeometry args={[1200, 1200]} /><meshStandardMaterial color="#53676e" roughness={1} /></mesh>
    {enclosed && <>
      <RigidBody type="fixed" colliders={false} position={[w.x - 1.99, 1.5, w.z]}><CuboidCollider args={[0.06, 1.5, 4]} /><mesh><boxGeometry args={[0.12, 3, 8]} /><meshStandardMaterial color="#be845c" /></mesh></RigidBody>
      {[-1, 1].map(side => <RigidBody key={side} type="fixed" colliders={false} position={[w.x - 0.995, 1.5, w.z + side * 2.02]}><CuboidCollider args={[2, 1.5, 0.06]} /><mesh><boxGeometry args={[4, 3, 0.12]} /><meshStandardMaterial color="#be845c" /></mesh></RigidBody>)}
    </>}
    <RigidBody type="fixed" colliders={false} position={[w.x, 1.5, w.z]}><CuboidCollider args={[w.halfWidth, 1.5, w.halfLength]} /><mesh><boxGeometry args={[w.halfWidth * 2, 3, w.halfLength * 2]} /><meshStandardMaterial color="#be845c" /></mesh></RigidBody>
  </>;
}
