# Phase D report: Kanpur Chronicles

**Branch:** `feature/phase-d-open-world-gameplay`, started from 54bb219 (Phase C, pushed and verified at 60 FPS on High at the start of this phase).

**Commits:**

| Commit | Change |
|---|---|
| 5b0eb32 | Flicker root causes fixed |
| 23da289 | Player status, economy, shops, combat, drifting |
| d300f97 | GPS and full map |
| 40fd991 | Ganga and Parmat Ghat |
| 99adc6d | Live 3D main menu |
| 5a64b03 | QA fixes: river flooding, T-pose |
| dbed5f8 | Combat balance |
| 9a6fa67 | Draw-call reductions |

**Preview tested:** https://kanpurverse-git-feature-phase-d-open-515752-aradhu74s-projects.vercel.app (build 40fd991). Commits after 40fd991 still need to be pushed and checked on the preview.

**Production:** not touched. It still runs the old `main` build.

## 1. Flickering: root causes and fixes

1. **Ground layers fighting for depth.** Pavement, parks, water, rail beds, roads and markings sat 1–3 cm apart, with a 0.1 m camera near plane. The 24-bit depth buffer cannot separate them beyond about 150 m. **Fix:** `layers.ts` now holds every height in one place. Separations are at least 1 cm, each layer has a strictly ordered polygon offset, and the near plane is 0.3 m.
2. **Overlapping roads at junctions.** Road ribbons overlap where roads meet, and each had UVs running along its own length. Tied depths therefore showed different texels and shimmered. **Fix:** planar world-space UVs, so overlapping triangles draw identical pixels.
3. **Shopfront strips on top of walls.** These overlays sat exactly on the facade walls. **Fix:** footprints pushed out by 5 cm.
4. **Shadow shimmer while moving.** The shadow camera followed the player continuously, so shadow edges swam. **Fix:** the shadow camera snaps to whole shadow-map texels, measured in the light's own plane. Covered by a test.
5. **Resolution pulsing.** Adaptive resolution could step up and down repeatedly. **Fix:** hysteresis. It now also detects when the CPU, not the GPU, is the limit, and stops lowering resolution in that case: lowering it only blurred the image, which is a likely source of the "pixelated" complaint.

Tested: `tests/rendering-stability.test.ts`. I watched the stationary, walking, driving and interior scenes in the browser and saw no flicker. I did not do a frame-by-frame capture across all 12 scene types.

## 2. Status

### Completed and verified in the browser (preview 40fd991)

**Weapon shop**
- Walk in through the door; Shera bhai's prompt appears.
- With ₹200, buying the ₹300 lathi is refused and money stays ₹200.
- With funds, buying the cricket bat takes ₹9,000 to ₹8,350. The bat shows in the HUD and in her right hand.
- After a reload, the save holds `weapons: ["w_bat"]`, `equipped: "w_bat"` and `spent: 650`.

**Clothing shop**
- Nasreen apa's interior, a live preview of the maroon kurti, buying it (₹700), "पहन लिया" and the kurti worn.
- After a reload the outfit and wardrobe are saved.
- Found and fixed: a T-pose after changing clothes (see "not yet verified" below).

**GPS and map**
- Full map, picking a point, "रास्ता लगाओ".
- The guidance banner reads "40 m बाद बाएँ मुड़ें · 3.2 km", and the minimap shows the gold route.
- Not verified: following a route all the way to its destination.

**Combat and knock-out**
- Goons spawn for the side mission "चोरी का माल", run at the player, hit for −7 and show health bars.
- At zero health: "बेहोश" screen, respawn at City Hospital with a ₹500 bill, and the mission is marked failed.
- Found: it was too hard to win, and the mission beam hid the enemies (fixed in dbed5f8, not yet verified).

**Driving**
- Entry notice: "वाहन में प्रवेश किया: वेल्टो छोटा · कॉम्पैक्ट हैचबैक".
- Handbrake turn at 59 km/h: the car slides sideways, lays skid marks and smoke, and the HUD shows "ड्रिफ्ट 235". This comes from the tyre model, not a canned animation.

**Save**
- The save is version 2, and v1 saves migrate (unit-tested).

**Single-player**
- The menu has no multiplayer anywhere.

### Implemented, not yet verified in the browser

These are covered by unit tests where noted.

- Fixes in commits after 40fd991: river clipping, T-pose, combat balance, compact combat ring, draw-call cuts, CPU-bound adaptive resolution, live 3D main menu, chai stall.
- Garage repair, hospital treatment and the showroom purchase and delivery (economy unit tests pass).
- Stamina drain and recovery, and fall and crash damage (unit tests pass).
- Ganga water and Parmat Ghat: the first browser view stood on flooded "river" because of the clipping bug, so the ghat itself has not been seen yet.
- Story weapon rewards (lathi after Chapter 4, spray after Chapter 5), and the new ghat and mechanic side missions.

### Partially implemented

- **Weapons:** the fictional weapons are code-built models. Ranged aiming uses the camera centre; there is no crosshair UI, and gamepad attack is not mapped.
- **Enemies:** chase, attack, stagger, stun and knock-out. No cover-seeking.
- **NPCs:** shopkeepers turn to face you and talk through their counter UI. No new pedestrian behaviours.
- **Shops:** walk-in interiors. No opening animation for the garage shutter.
- **Riverfront:** one ghat. No boats you can use.

### Not implemented

- Rain and wet roads, screen-space reflections, texture-quality and reflection-quality settings.
- Breakable props, pushable objects, vehicle damage visuals beyond the condition number.
- Recorded voices for shopkeepers.
- Gameplay footage.

### Blocked

- The latest commits need a push.
- The GitHub transfer to velto-studios still has to be accepted.
- Production promotion needs your approval.

## 3. Performance (Apple M2, Chrome, 1470×745 window, High unless noted)

| Scene | Build | Avg FPS | Notes |
|---|---|---|---|
| Walking, Mall Road | 54bb219 (start) | 60.0 | 1% low 56.8, p95 17.4 ms |
| Driving and drifting, Mall Road | 40fd991 | 31.4 | p95 49 ms |
| Driving, Mall Road | 40fd991 | 26.6 | 1,421 draw calls per frame; adaptive resolution had fallen to 0.75 DPR with no gain, so the frame is CPU- and draw-call-bound |
| Driving, after 9a6fa67 | — | pending push | |

Fixes for the driving slowdown are in 9a6fa67 and still need to be measured. Not yet measured: busy market, combat, the shop interiors, the riverfront, night, and a cutscene.

## 4. Tests

263 automated tests pass, covering:

- Economy atomicity, the v2 save migration, stamina, combat and knock-out.
- Drift physics and the GPS on real OpenStreetMap data, including that the route to the ghat never crosses the Ganga.
- River clipping, rendering-stability rules, the story campaign end to end with combat gates, and the single-player guards.

Typecheck passes, lint shows 0 errors, and the production build succeeds.
