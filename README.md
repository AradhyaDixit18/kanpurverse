# KanpurVerse

**Apna shehar, apni duniya.** A free, browser-based multiplayer open world built on the **real streets of Kanpur** (OpenStreetMap data), by Velto Studios.

**Play now:** https://kanpurverse.vercel.app · Server: `wss://kanpurverse-server.onrender.com` · Source: https://github.com/AradhyaDixit18/kanpurverse

Walk The Mall Road and Bada Chauraha, wait at a real railway phatak while the train passes, drive an auto, e‑rickshaw, bus or taxi to Kanpur Central, talk to Kanpuriya NPCs in their own voice (Kanpuriya / हिंदी / English, with subtitles), run 14 Kanpuriya missions, and play with friends in real time. The in‑game clock is real Kanpur time (IST).

## Run it locally (Mac, one command)

```bash
cd ~/Desktop/VeltoStudios/KanpurVerse && ./RUN_ON_MAC.sh
```

Then open **http://localhost:3000** in Brave. A second (private) window is a second player in the same room.

Manually: `npm install`, then `npm run dev:server` (ws://localhost:8787) and `npm run dev:web` (http://localhost:3000).

## Verify

```bash
npm run verify                 # typecheck + lint + tests (incl. multiplayer) + production build
python3 scripts/geo/fetch_kanpur_osm.py --check   # validate the OSM extract
```

## Layout

```
apps/web         Next.js 15 + React Three Fiber client: OSM city streaming (OsmCity.tsx), railway + crossings
                 (RailwayOsm.tsx), vehicles, NPCs/crowd, animals, props, sky/IBL/post, HUD, menu, loading
apps/server      Node WebSocket server: server-authoritative rooms, IST world clock, movement/vehicle validation,
                 missions, economy, moderation; file store or MongoDB Atlas
packages/shared  Protocol (zod), geo projection + anchors (geo.ts), world/missions/vehicles (world.ts), dialogue schema
assets/dialogues NPC lines in Kanpuriya Hindi, Standard Hindi, English (same ids); MP3s in apps/web/public/audio
scripts/geo      fetch_kanpur_osm.py — Overpass → apps/web/public/geo/kanpur.json (+ --check)
scripts          generate_voices.py — Edge neural TTS (runs in .github/workflows/voices.yml)
.github          ci, voices, geo-assets (OSM + CC0 textures/HDRIs), visual (Playwright screenshots)
tests            vitest: shared logic, geo anchors, real multi-client multiplayer
deployment       Dockerfile.server (Render), render.yaml, fly.toml; apps/web/vercel.json
docs             Blueprint, map research, geographic accuracy audit, vehicle/NPC/animal systems, dialogue guide,
                 multiplayer architecture, performance, QA, FINAL_DEPLOYMENT_REPORT.md (honest per-feature status)
```

## Controls

W A S D move · Shift sprint · Space jump / brake · mouse look (click to lock) · **E** talk / enter / photo · **F** exit vehicle · **R** reset vehicle · **H** horn · **C** camera (3rd / close / far / 1st) · **Q** look back · **J** missions · **P** photo mode · **I** inventory · **M** map · Tab social · T chat · 1–6 emotes · F1 help · Esc menu. Touch: joystick + buttons.

## Data and licences

Map data © OpenStreetMap contributors (ODbL 1.0). Textures: ambientCG (CC0). HDRIs: Poly Haven (CC0). Fonts: Inter, Noto Sans Devanagari (OFL). Voices: Microsoft Edge neural TTS. Code: MIT. Landmarks are stylised approximations, never claimed as exact replicas — see `docs/KANPUR_GEOGRAPHIC_ACCURACY_AUDIT.md`. No real business or person is depicted.
