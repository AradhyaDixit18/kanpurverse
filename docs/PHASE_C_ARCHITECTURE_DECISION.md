# Phase C: engine assessment and decision

13 November 2026. Decision approved by the owner: **stay in the browser and upgrade the three.js stack**. Unreal Engine 5 is recorded below as a possible future product, not started.

## Starting state

- Branch `feature/phase-b-graphics-vehicles` at 34876e7, pushed; Vercel preview Ready (kanpurverse-git-feature-phase-b-graph-69acbf-aradhu74s-projects.vercel.app).
- Phase C branch `feature/phase-c-single-player-upgrade` created from it.
- Backup tarball `KanpurVerse-pre-relaunch-20261113-0110.tgz` in the Cowork outputs folder, unchanged.
- Production (kanpurverse.vercel.app) still serves `main` (b37f576), the **old multiplayer build**. That is where a multiplayer option is still visible, and it will stay that way until a verified single-player build is promoted.

## What the current engine is

three.js 0.180 rendered through React Three Fiber, Rapier physics (WASM), pmndrs postprocessing, Next.js 15 on Vercel. The engine itself was never the limiting factor. The limit was the content: every character, vehicle and building was code-built primitives.

## Comparison

| Criterion | Current build (before C) | three.js, upgraded | Babylon.js | Unreal Engine 5 / Unity |
|---|---|---|---|---|
| Character realism | Block figures | Rigged glTF humans with skeletal clips, PBR skin and hair. Facial rigs are possible if the asset has blend shapes | Same ceiling as three.js | MetaHuman-class faces, cloth and hair simulation |
| Vehicle realism | Code-built bodies | Detailed glTF vehicles with PBR clearcoat. Limited mainly by asset budget | Same | Far higher (Chaos vehicles, high-poly assets) |
| Environment detail | OSM extrusion | Instanced kits, LOD, streaming of GLB tiles. Draw calls and download size are the ceiling | Similar; slightly more built-in scene tooling | Nanite geometry, World Partition streaming |
| Lighting and shadows | One cascade, AO, bloom | Cascaded shadows, N8AO, SSR (postprocessing), baked lightmaps; WebGPU renderer available in r180 | Comparable; built-in SSR and clustered lights | Lumen global illumination and reflections, virtual shadow maps |
| Performance | Measured: Medium 60 FPS, Ultra 24.5 (before the Phase B fix) | Good with careful budgets; CPU-bound on JS | Similar | Much higher headroom on native GPU |
| Browser support | Yes | Yes | Yes | No. Pixel streaming only, which is costly |
| Development complexity | — | Low: reuses everything (story, saves, physics, UI, tests) | High: rewrite of every scene component | Very high: new codebase, C++/Blueprint, artist pipeline |
| Deployment | Vercel URL | Vercel URL | Vercel URL | Mac/Windows downloads, signing, store or launcher |

**Honest limit.** No WebGL or WebGPU browser game reaches RDR2 or GTA V fidelity. Those games rely on hundreds of artists, native GPU features (real-time GI, virtual shadow maps, hair strands) and 50–150 GB of content. A browser build can look good and clean, but stylised-realistic, not photoreal.

**Why not Babylon.js:** it has the same rendering ceiling as three.js and would mean rewriting about 60 working components for no visual gain.

**Why not UE5 now:** it gives up the instant web link and every line of existing code, and real progress there depends on 3D artists and a local Unreal install, not code alone. If you later want a premium native edition, the reusable parts are the story data (`story.ts`), dialogue JSON, mission and vehicle specs, and the OSM extract. A UE5 prototype would start from those.

## What Phase C does with three.js

1. A real asset pipeline: GLB with a licence register (`docs/ASSET_LICENCES.md`, `scripts/assets/build-characters.mjs`).
2. Rigged CC0 human characters for Kanupriya and every NPC (Quaternius, 65-joint humanoid, 20 animation clips).
3. Single-player only: the multiplayer code is deleted, not hidden.
4. Kanpuriya-first language throughout the story and the interface.
5. The rendering foundation from Phase B (central graphics configuration, N8AO, night lighting), verified in the browser.

Out of reach this phase, and not claimed: photoreal faces, lip-sync (the CC0 bodies have no blend shapes), artist-made Indian vehicle GLBs, landmark-accurate architecture, and recorded voice acting.
