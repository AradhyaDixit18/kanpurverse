# Performance Report — v0.5 (2026-11-07)

## Measured (COMPLETED AND VERIFIED)
Device: MacBook (Apple Silicon), Brave, 1470×867 CSS px at DPR 2, quality **Medium** (default), public build https://kanpurverse.vercel.app.

| Metric | Value | How measured |
|---|---|---|
| Frame rate at spawn (The Mall Road, Bada Chauraha) | **59–61 FPS** | in-game counter (`__kv.state().fps`) over several minutes |
| Frame rate during tile streaming (first 2 s after load / after moving 250 m) | dips to ~42 FPS for < 1 s | counter sampled right after load |
| Scene at spawn | 4,638 meshes (483 merged road/building/rail meshes across 25 tiles, rest = props/crowd/vehicles/animals), ≈ 888 k triangles | `__kv.scene()` |
| JS heap after 5 min | ≈ 250 MB | `performance.memory` |
| First Load JS (`/play`) | **149 kB** gzip (shared 103 kB + page 43 kB) | `next build` |
| 3D bundle (three + fiber + drei + rapier WASM glue), loaded lazily behind the loading screen | 777 kB gzip | largest chunk |
| Textures (12 ambientCG sets at 512 px, colour+normal+rough JPG) | 1.9 MB total on disk, ~1.2 MB fetched per session | `public/tex` |
| HDRI (3 Poly Haven 1k) | 4.4 MB on disk, one (~1.5 MB) fetched per time-of-day band | `public/hdr` |
| Dialogue audio (55 lines × 3 languages, MP3) | 6.1 MB on disk, fetched one line at a time on demand (206 partial) | `public/audio/dialogues` |
| OSM extract | 868 kB JSON, one fetch, cached | `public/geo/kanpur.json` |
| Network to the game server | ≈ 6 kB/s down at 20 Hz with 1–2 players; ≤ 1 kB/s up | protocol estimate, see MULTIPLAYER_ARCHITECTURE |
| Ping (Mumbai → Render Singapore) | 110–150 ms | HUD |

## Techniques in use
- **Tile streaming**: the city is bucketed into 250 m tiles; 5×5 tiles (Medium/High) or 3×3 (Low) around the player are mounted; physics colliders only in the 3×3 ring. Each tile merges all roads, pavements, rails, buildings-by-style and shopfronts into a handful of `BufferGeometry` draws (≈ 20 draw calls per tile).
- **Instancing**: trees, pigeon flocks, poles; crowd/animals are cheap primitives.
- **Textures loaded once** at the city root and shared by every tile (v0.5.1 fix — see QA_REPORT "empty city").
- **Quality tiers** (Settings): Low = no shadows, no post-processing, DPR ≤ 1.25, 3×3 tiles, no road markings/labels; Medium = PCF soft shadows, SMAA+Bloom+Vignette, DPR ≤ 1.25; High = DPR up to 2.
- Shadows: single directional light with a 160 m shadow frustum following the player.
- HUD canvases (compass, minimap, speedo) are 2D and read shared refs — no React state per frame.
- Code splitting: HUD and character creator are dynamic imports; the 3D bundle loads behind the staged loading screen with progress.

## Not measured / IMPLEMENTED BUT NOT VERIFIED
- Phones and low-end laptops (Low tier is implemented; the touch joystick is implemented; neither was tested on a real phone this session).
- 10+ concurrent players in one room (vitest covers 2–4 `ws` clients; browser test covered 2).
- Memory over a 1-hour session (tile disposal is implemented via React unmount + `geometry.dispose()` in effects; no long-run leak test yet).

## Known costs / next
- 4.6 k meshes is high for a scene at 60 FPS mainly because props, crowd and animals are separate meshes; instancing those is the next win for Low-tier devices.
- The 777 kB 3D chunk could be cut by ~200 kB by dropping `@react-three/postprocessing` on Low and lazy-loading the vehicle meshes.
- `Text` labels (troika) cost a font load (~200 kB) and one draw each; they are already suspended independently so they never block a tile.


## Phase 2 measurement status — 8 November 2026

PARTIALLY IMPLEMENTED. Earlier measurements above remain historical. Fresh 73-test baseline/build passed; no new representative FPS, frame-time distribution, memory, draw-call, loading or multiplayer throughput measurements yet. No 60 FPS achievement claimed. Exit safety uses a 50-metre coarse server polygon index queried only on requests; runtime costs still require measurement. See PHASE_2_QA_REPORT.md for identified browser/hardware conditions when sampled.
