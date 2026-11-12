# Phase B technical audit: Kanpur Chronicles

13 November 2026. Branch `feature/phase-b-graphics-vehicles`, from 5c7b234. Baseline measured on the deployed preview of 5c7b234: MacBook (DPR 2 screen), Chrome, 1470×801 window, standing at the Mall Road spawn, 10 s rAF sample.

| Preset | Avg FPS | p50 frame | p95 frame | p99 frame | JS heap |
|---|---|---|---|---|---|
| Medium | 60.0 | 16.7 ms | 17.6 ms | 17.7 ms | 240 MB |
| Ultra | 24.5 | 33.4 ms | 50.9 ms | 51.1 ms | 242 MB |

## What the game is made of

| Area | Implementation | Genuine 3D asset? | Weaknesses found |
|---|---|---|---|
| Engine | three.js 0.180 + React Three Fiber 9 + Rapier 2 physics + postprocessing 6, Next.js 15 | n/a | Adequate for the targets. A new engine isn't justified |
| City | OpenStreetMap roads and footprints extruded at runtime; procedural infill lots; canvas facade atlas (8 palettes); CC0 PBR textures for asphalt/pavement/grass | Procedural | Same window bay repeats; flat roofs; no lit windows at night; per-tile material instances |
| Landmarks | Stylised station, temple and mall shells in code | Procedural placeholders | Not accurate recreations; documented as tributes |
| Characters | `Avatar.tsx`: articulated rounded primitives with code-driven pose blending and a distance LOD | Procedural, no skinned rig | Blocky look; no facial detail; no skeleton or UV clothing |
| Vehicles (before) | `Vehicles.tsx`: boxes plus a rounded box per class, 10 classes, arcade speed/turn model | Placeholders | Box silhouettes, no interiors, no indicators/reverse lights, Space was a brake, no speed-sensitive steering, no slides |
| Traffic and NPCs | Deterministic road-loop traffic with swept contacts; crowd pedestrians with throttled updates | Procedural | Traffic used only the 10 old classes |
| Lighting | Gradient sky shader, sun/moon, hemisphere and ambient, one shadowed directional light following the player, three CC0 HDRIs | n/a | Night relied on ambient light alone; no streetlights or windows; no headlight light |
| Post | SSAO (16 samples, full resolution on Ultra), bloom, hue/saturation, vignette, SMAA | n/a | **Ultra bottleneck:** full-res SSAO at DPR 1.75 → 24.5 FPS |
| Settings | Preset only, applied across files | n/a | No per-option control; Low skipped post; no resolution scale |
| Audio | WebAudio synthesis (engine, horn, footsteps, UI, music bed) + Edge TTS dialogue | Procedural | One engine voice for every vehicle; no crash or skid sound |
| HUD | Stats, compass, minimap, mission card, speed number with bar | n/a | Stats card overlaps the street-tools panel at the top left (seen in the baseline screenshot) |

## Priorities and outcome in this phase

| # | Improvement | Priority | Complexity | Status |
|---|---|---|---|---|
| 1 | Central graphics config with working per-option settings; fix the Ultra bottleneck | P0 | M | Implemented (commit 2ba09de) |
| 2 | Original Indian vehicle collection (18 classes) with LOD and cached geometry | P0 | L | Implemented (83b9b3a) |
| 3 | Class-specific handling (bicycle model, grip, handbrake slide, brake-then-reverse) | P0 | M | Implemented and unit-tested (83b9b3a) |
| 4 | Vehicle lights, indicators, headlamps, gamepad, controls guide, engine voices | P1 | M | Implemented (83b9b3a) |
| 5 | Night city: streetlights, light pools, lit windows and shops | P1 | M | Implemented (b43c84d) |
| 6 | Skinned character rig and new Kanupriya model | P1 | XL | **Not done.** Needs an artist-made rigged GLB or a Blender pipeline |
| 7 | District-specific architecture, landmark kits, potholes, construction areas | P2 | XL | **Not done** in this pass |
| 8 | Rain, depth of field in cutscenes, cascaded shadows | P2 | M | **Not done** |

A status in this table means the code exists and passes the automated tests. Visual verification is recorded separately in `PHASE_B_REPORT.md`.
