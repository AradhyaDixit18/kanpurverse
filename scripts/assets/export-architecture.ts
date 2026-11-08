/** Reproducible original source → Blender-compatible GLB. No external model assets. */
import fs from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { facadeParts } from "../../apps/web/src/game/facadeKit";
import { building } from "../../apps/web/src/game/worldGeometry";
// GLTFExporter uses the browser FileReader interface for buffer packaging, not DOM rendering.
class BufferReader { result: ArrayBuffer | string | null = null; onloadend?: () => void; readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(b => { this.result=b;this.onloadend?.(); }); } readAsDataURL(blob: Blob) { blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString("base64")}`;this.onloadend?.();}); } }
Object.assign(globalThis,{FileReader:BufferReader});
async function main(){
 const pts:[number,number][]=[[-4,-3],[4,-3],[4,3],[-4,3],[-4,-3]],h=6.4,group=new THREE.Group();group.name="kv_shophouse_reference_lod0";
 group.userData={creator:"Velto Studios / KanpurVerse",licence:"MIT; original generated geometry",units:"metres",up:"Y",forward:"+Z",origin:"floor centre",source:"scripts/assets/export-architecture.ts + facadeKit.ts",collision:"separate; visual reference only",geographicAccuracy:"original modular reference, not a real business or surveyed building"};
 const shell=building(pts,h);group.add(new THREE.Mesh(shell.walls,new THREE.MeshStandardMaterial({color:"#d6c5aa",roughness:.92})),new THREE.Mesh(shell.roof,new THREE.MeshStandardMaterial({color:"#8f8a7c",roughness:1})));
 const layers=facadeParts([{pts,h,style:1,shop:true}]);
 for(const [name,parts]of Object.entries(layers)){
  const gs=parts.map(p=>{const g=new THREE.BoxGeometry(...p.size).toNonIndexed();g.rotateY(p.yaw);g.translate(...p.p);const c=new THREE.Color(p.color),a=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;});
  const geometry=mergeGeometries(gs);gs.forEach(g=>g.dispose());if(geometry){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88}));m.name=`kv_facade_${name}`;group.add(m);}
 }
 const result=await new GLTFExporter().parseAsync(group,{binary:true,onlyVisible:true});
 if(!(result instanceof ArrayBuffer))throw new Error("Expected GLB");
 const path="apps/web/public/models/architecture/kv_shophouse_reference_lod0.glb";await fs.writeFile(path,new Uint8Array(result));
 const box=new THREE.Box3().setFromObject(group),triangles=group.children.reduce((n,o)=>{const g=(o as THREE.Mesh).geometry;return n+(g.index?.count??g.getAttribute('position').count)/3;},0);
 await fs.writeFile("docs/PHASE_3_ARCHITECTURE_ASSET_QA.json",JSON.stringify({asset:path,bytes:result.byteLength,triangles,meshCount:group.children.length,bounds:{min:box.min.toArray(),max:box.max.toArray()},...group.userData,uv:"All surfaces have UV0; procedural colour + vertex-colour materials",lod:"LOD0 reference only; runtime city uses distance-bounded instancing and a far atlas",rig:"not applicable",topology:"triangles, finite positions/normals/UVs checked on browser-compatible GLTFLoader decode",status:"IMPLEMENTED BUT NOT VERIFIED; run asset decode tests and inspect browser"},null,2)+"\n");
 console.log(`Exported ${path}: ${result.byteLength} bytes, ${triangles} triangles`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
