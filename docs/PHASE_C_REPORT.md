# Phase C report: Kanpur Chronicles

Branch `feature/phase-c-single-player-upgrade` (from 34876e7). Commits:

- f80a8f2: multiplayer removal and rigged characters
- bf4d75e: Kanpuriya-first language and the engine decision
- 02a91e8: fixes from the measured preview test
- 885594f: NPCs address Kanupriya correctly
- 560c361: Hindi vehicle prompts, handbrake hint, driver tag removed

Rollback tag `archive/multiplayer-before-removal` → 34876e7 (local; push with `git push origin --tags`).

Preview tested: https://kanpurverse-git-feature-phase-c-singl-e567a9-aradhu74s-projects.vercel.app (build bf4d75e). Commits after bf4d75e still need a push and re-test. Production (kanpurverse.vercel.app) still runs the old multiplayer `main` build and was not touched.

## Status

**COMPLETED AND VERIFIED (in the real browser, on preview bf4d75e)**
- Landing page and language gate are Hindi-first; Devanagari renders correctly with no missing glyphs; the menu has no multiplayer option.
- Kanupriya appears as a rigged, skinned human. The walk/jog cycles play with no foot sliding, she faces the direction of travel, and her clothes are teal kurti, jeans and white shoes with a camera bag.
- NPCs (Babloo, the paan seller, crowd) are rigged humans with varied outfits and hair.
- NPC dialogue panel opens with a Chapter 1 button.
- Night scene shows lit windows, glowing shopfronts and light pools under streetlights.
- Driving the hatchback: real headlight beams at night, speedometer with gear and condition, collision with a pole lowers condition to 74%.
- Performance measured on all four presets (table below).

**IMPLEMENTED, NOT YET VERIFIED IN THE BROWSER** (commits after bf4d75e): AO off by default; the hoop strap removed; the भैया→दीदी/बिटिया/मैडम rewrites; Hindi vehicle names in prompts; the driver name tag removed.

**PARTIAL**
- Characters come from CC0 "Superhero"-proportioned bases. They are stylised-realistic, not photoreal.
- No facial blend shapes, so no blinking, expressions or lip-sync.
- The clothing is a generated body shell, not modelled garments.
- Vehicles are still code-built, improved in Phase B, not artist-made GLBs. The hatchback reads as a car, but detail is moderate.
- City buildings and roads are unchanged from Phase B, apart from the night lighting.
- 13 rewritten lines lost their recorded Edge-TTS voice and fall back to browser speech until `npm run voices` is re-run.

**NOT IMPLEMENTED**
- Photoreal faces, door-opening and vehicle-entry animations.
- Neighbourhood-specific architecture and accurate landmarks; potholes, manholes, traffic signals, zebra crossings.
- Rain, wet roads, screen-space reflections.
- New ambient sound beds (market, temple, river, dogs).
- Showcase footage.

**BLOCKED / NEEDS YOU**
- Push the last three commits so they can be verified.
- Accept the GitHub transfer.
- Approve when to promote a verified build to production.

## Performance (Apple M2, Chrome, 1470×745 window, DPR 2 screen, 10 s rAF samples, standing at Mall Road unless noted)

| Build / preset | Avg FPS | 1% low | p50 | p95 | Notes |
|---|---|---|---|---|---|
| Phase A baseline, Medium | 60.0 | — | 16.7 ms | 17.6 ms | block characters |
| Phase A baseline, Ultra | 24.5 | — | 33.4 ms | 50.9 ms | |
| Phase C, Medium | 60.0 | 56.5 | 16.7 ms | 17.6 ms | rigged characters; JS heap 360 MB; character download 3.2 MB |
| Phase C, High (AO on) | 44.1 | 26.8 | 16.7 ms | 33.4 ms | |
| Phase C, High (AO off) | 59.4 | 29.7 | 16.7 ms | 17.7 ms | → AO now off by default |
| Phase C, Ultra (AO on) | 25.0 | 2.3 | 33.3 ms | 67.6 ms | |
| Phase C, Ultra (AO off) | 60.0 | 56.5 | 16.7 ms | 17.6 ms | MSAA 4×, 4096 shadows |
| Phase C, High (AO on), driving at night | 31.0 | — | — | 49.9 ms | to re-measure with AO off |

Frame rate is capped at 60 by vsync. GPU timers aren't exposed, so the bottleneck was found by toggling one setting at a time. Not yet measured: busy market, dense traffic, NPC-heavy junction, cutscene, load time.
