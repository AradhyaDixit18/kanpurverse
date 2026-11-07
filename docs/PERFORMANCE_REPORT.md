# Performance Report

**Measured in this session (headless, Linux sandbox):**
| Metric | Value |
|---|---|
| Production build time | 12.9–27.6 s (`next build`) |
| `/` first-load JS | 106 kB |
| `/play` first-load JS | 1.16 MB (three.js ≈ 600 kB, Rapier WASM ≈ 2 MB loaded lazily by `@react-three/rapier`, drei/troika text, React) |
| Server tick | 20 Hz; 5-test multiplayer suite incl. ~25 s of simulated walking runs in ≈10 s wall time |
| Server memory (idle, file store) | ≈ 45 MB RSS (Node 22) |
| Unit + integration tests | 15 pass in ≈ 10.5 s |

**Not measured (needs a GPU/browser on the Mac):** FPS, frame time, draw calls, shader compile time, mobile thermals. Expectations below are design targets, not results.

## Rendering budget and techniques
- Buildings: one `InstancedMesh` per style (5 draw calls for all buildings) with a canvas window texture; trees 2 instanced draws; street lights 2.
- Roads: 9 planes + pavements + dashes (merged per road in future).
- Text: troika SDF text for ~45 signs/labels (each a draw call; LOD/culling by fog distance).
- Avatars: ~20 primitives each, code-animated (no skinning); 10 NPCs + up to 31 remote players ≈ 800 meshes worst case → candidate for merged geometry in v1.1.
- Quality tiers: Low (no shadows, no AA, fog 180 m, DPR ≤ 1.25, 60 trees), Medium (default), High (2k shadow map, DPR up to 2, 240 trees). `AdaptiveDpr` lowers resolution under load.
- Physics: Rapier WASM, fixed colliders for ~30 buildings + lake + bounds + trees; one kinematic capsule per player; one body per vehicle. Vehicle driver body is dynamic only for the local driver.

## Targets
| Device | Target |
|---|---|
| M2 MacBook Air (Brave) | 60 fps at High |
| Mid-range Android (2022, Chrome) | 30 fps at Low |
| iPhone 12+ (Safari) | 45–60 fps at Medium |

## Known hot spots (to verify on device)
1. HUD subscribes to the whole store → React re-render at 20 Hz. Acceptable, but move to selectors if profiler shows >3 ms.
2. Remote avatars re-render per snapshot; materials are memoised by appearance content (fixed in this build).
3. `generateBuildings()` is called by Trees and Buildings separately (deterministic, ~1 ms) — fine.
4. Troika text with Devanagari: first-render font parse ~100–200 ms (86 KB woff) — one-time.

## Network
Snapshot ≈ 6.7 KB/tick at 32 players (see MULTIPLAYER_ARCHITECTURE). At 2–8 players: 0.4–1.7 KB/tick ≈ 8–34 KB/s. Fine on 4G.
