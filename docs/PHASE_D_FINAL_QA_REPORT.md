# Phase D final QA report: Kanpur Chronicles

Date: 13 November 2026
Branch: `feature/phase-d-open-world-gameplay`

## 1. What was tested

| Item | Value |
|---|---|
| Preview URL | https://kanpurverse-git-feature-phase-d-open-515752-aradhu74s-projects.vercel.app/play |
| Commit on the remote and on the preview | `d513c71` (contains `0783656`) |
| Commit checked at the end (local, not yet pushed) | `1981e5a`, 8 commits ahead of the remote |
| Production | Not touched. Nothing merged into `main`. No Vercel settings changed. |

**How I know the preview was running `d513c71`:**
- `git ls-remote` shows the branch head at `d513c71`.
- The served menu includes `menu-v2` (added in `0783656`).
- The minimap at Parmat Ghat no longer shows the all-water fill (fixed in `d513c71`).

**Git and remote:**
- Remote: `AradhyaDixit18/kanpurverse`.
- `velto-studios/kanpurverse` still asks for credentials, so the transfer has not been accepted yet.
- Backup branches and the `archive/multiplayer-before-removal` tag are intact.
- No force-push, no reset, nothing deleted.

## 2. Test setup

- **Device and browser:** Apple M2 (ANGLE Metal renderer), 8 logical cores, Chrome 157 on macOS.
- **Window:** 1470×801, device pixel ratio 2. The game's adaptive resolution settled at 1.5.
- **Graphics:** High preset, sunset atmosphere unless noted.

**Method:**
- Real browser, driven with keyboard events.
- Saves edited only from the main menu, to place the player.
- FPS taken from a requestAnimationFrame sampler.
- Draw calls counted by wrapping the WebGL draw functions.
- Small-draw positions read from each draw's `modelMatrix` uniform.

## 3. Results on the deployed preview (`d513c71`)

| Area | Result | Evidence |
|---|---|---|
| Main menu, live 3D background | Pass | Sunset street, skyline, lamps, Kanupriya in her saved outfit, car. `docs/qa/phase-d-final/main-menu-live-3d-d513c71.jpg` |
| Main menu layout | Fail, fixed in `eb62ddb` | The list ran under the footer and covered "सेटिंग्स". |
| Language and game start | Pass | Continue loads the v2 save at the stored position. |
| Ganga boundary at Parmat Ghat | Pass | The water polygon starts at the bottom step. The bank collider stopped her at the water's edge. |
| Parmat Ghat visuals | Pass with one defect, fixed in `921718a` | Steps, chhatri, lamps, diya stall with vendor and name board render. A 14 m sand strip was drawn over the river, so the boats appeared to sit on a grey slab. |
| Minimap land and water | Pass | At the ghat the river is now drawn only on the river side. |
| Parks | Pass | The park at (482, −810) renders as a lawn. |
| Station platforms | Render, defect fixed in `2c8249c` | Platforms were a floating 0.9 m ribbon with no collider, so Kanupriya appeared waist-deep inside them. |
| Weapon shop | Pass | Lathi bought ₹2,614 → ₹2,314. "हाथ में लो" equips it and the HUD shows "बाँस की लाठी". After a refresh: `weapons [w_bat, w_lathi]`, `equipped w_lathi`. |
| Clothing shop | Pass, two defects fixed | See section 4. |
| Health, stamina, money, inventory | Pass | Sprint drains stamina 100 → 3 in 6 s, then it recovers. Money and the bandage persist. |
| Combat | Pass | "चोरी का माल": two goons chase and hit (health 100 → 88), are knocked out with the bat, and the objective clears. |
| Mission completion | Pass | +₹650 and +300 XP (₹5,750 → ₹6,400). Saved in `missionsCompleted` after a refresh. |
| Hospital | Pass | Treatment 88 → 100 for ₹150. The button is disabled at full health and does not charge. A bandage bought for ₹70. |
| Showroom | Pass | The ₹15,000 hatchback is refused ("₹8,820 और चाहिए"). Scooter bought ₹6,180 → ₹2,680, delivered outside, still there after a refresh, and rideable. |
| Garage | Pass | Scooter body 89% → 100% for ₹66. The button then reads "सब ठीक है". |
| Vehicle damage | Pass | A wall impact took the scooter's body to 89%. |
| GPS and full map | Pass for the mission route; defect fixed in `1981e5a` | Map picking and "रास्ता लगाओ" work. Banner and chevrons work, and the mission route was followed to both checkpoints. A garage route from 57 m away was 1.1 km long (see section 4). |
| Minimap while driving | Fail, fixed in `5deed00` | The arrow and rotation stayed at her last on-foot heading. |
| Camera | Defect fixed in `120db60` | Backed against a wall, the camera went through it and showed only the wall. |
| Night | Pass | Lit shopfronts, streetlight pools and stars on Mall Road. |
| Save and refresh | Pass | Coins, outfit, wardrobe, weapons, equipped weapon, items, vehicles, vehicle condition and completed missions all survived refreshes. |
| No multiplayer | Pass | The menu has no multiplayer entries. In-game network traffic is same-origin static files only (`/geo/kanpur.json`, `/tex/*`), all 200. There is no WebSocket or API traffic. The source has no `WebSocket`, socket.io, Colyseus or `/api` calls. The only API route is a development-only capture sink that returns 403 outside localhost development. |
| Console | Pass | No game errors. One exception came from Vercel's preview toolbar script (`vercel.live`), triggered by my synthetic events. |

### Not tested in this pass

These were tested in the previous Phase D pass: the drift tyre model, skid marks, smoke and the drift score.

- **Vehicle-entry notice.** The notice code is unchanged. In this pass I read the page 1.5 s after getting on and the notice wasn't there yet. It was seen working in the previous pass.

## 4. Bugs found and fixed

Each fix has a regression test. After every fix I ran typecheck, lint, the test suite and the production build.

**1. Clothing screen was a separate, disconnected system** (`c10433b`)
- Problem: the menu's "किरदार · रूप, नाम, कपड़े" screen had its own Top, Bottom and Shoes swatches. They wrote old fields that the in-game Kanupriya ignores. Its preview didn't show her outfit, and its text pointed to the removed Naveen Market.
- Cause: the screen was left over from the pre-Phase D avatar editor.
- Fix: the screen now reads her saved wardrobe and outfit and offers only owned items per slot. The preview uses her outfit. Saving writes the same outfit into the v2 save.
- Test: new shared helpers `wardrobeFor` and `sanitizeOutfit` are unit-tested.

**2. Fitting-room preview hidden** (`eb62ddb`)
- Problem: the clothing panel says Kanupriya is showing the preview, but the full-screen panel covered her.
- Fix: the panel now docks to the left in the clothing shop.
- Also in this commit: the menu footer overlap, and the shop's Escape handler now uses `stopImmediatePropagation`.

**3. Sand band over the Ganga** (`921718a`)
- Problem: a 14 m sand-coloured band covered the river along the whole bank.
- Cause: the shoreline strip extended 7 m to both sides of the bank, and its polygon offset drew it over the water.
- Fix: the strip is built on the land side only.
- Test: under 2% of strip quads may fall in the water.

**4. Platforms not solid** (`2c8249c`)
- Problem: platforms were a floating ribbon with no collider. Before `d513c71` they weren't drawn at all, so this was hidden.
- Fix: platforms are now 0.4 m slabs, within the 0.45 m step the character can climb. They have kerb faces and one collider box per segment.
- Test: height, kerbs and colliders.

**5. Camera through walls** (`120db60`)
- Problem: with her back to a wall, the view showed only the wall.
- Cause: the collision clamp kept the camera at least 0.8 m back, which pushed it through a wall right behind her.
- Fix: the clamp keeps the camera on her side of the hit, and the camera snaps in when blocked instead of drifting.
- Test: covered by a unit test.

**6. Distant vehicles costing draw calls** (`d268279`)
- Problem: about 350 of the 1,280 draws per frame were single-box draws of parked or traffic vehicles 100–600 m away, each 6–8 px wide.
- How found: by reading each small draw's `modelMatrix` uniform.
- Fix: whole vehicles are no longer drawn beyond `clamp(view distance × 0.4, 120, 320)`. That is 240 m on High, 120 m on Low and 304 m on Ultra.
- Status: the performance gain is not yet measured on the preview.

**7. Minimap frozen while driving** (`5deed00`)
- Cause: only the on-foot code updated `playerYaw`.
- Fix: the driver now publishes the vehicle's yaw, which uses the same convention.
- Test: covers the convention.

**8. GPS detours** (`1981e5a`)
- Problem: from 57 m away, the garage route was 1,082 m.
- Cause: OSM ways in the extract often cross, or stop 0.2–6 m short of another road, without a shared node. The graph had no junction there.
- Fix: `stitchRoads` splits roads at real crossings and bridges dangling ends to a road within 6 m. Motorway and trunk crossings are left alone, as they are likely flyovers.
- Result: the same trip is now under 200 m.
- Tests: all 12 GPS tests pass, including "never crosses the Ganga" and routes to every shop and mission start. The city graph builds in about 0.35 s.

These eight fixes are not yet visible on the preview.

## 5. Performance (preview `d513c71`, High preset)

| Scene | Avg FPS | 1% low | p95 frame | Draw calls per frame |
|---|---|---|---|---|
| Standing at the showroom, sunset | 31.0 | 19.2 | 50 ms | 1,280 |
| Riding the scooter at about 63 km/h (run 1) | 10.0 | 0.2 | 148 ms | 917 |
| Riding the scooter at about 63 km/h (run 2, 8 s) | 26.6 | — | median 33 ms; worst 216 ms | — |
| Standing on Mall Road at night | 47.2 | 28.4 | 34 ms | about 1,031 |

**Draw-call breakdown at the showroom:**
- 911 of the draws use the standard material and 176 are shadow-depth draws.
- About 740 are single boxes (36 indices or fewer).
- Of those, 348 were more than 100 m away: these are what fix 6 removes.

**Ride run 1** included a stall of several seconds at the start of the ride. Run 2 shows steady 30 Hz frames (median 33 ms) with one 216 ms hitch. The cause of the stall has not been isolated; tile streaming on the main thread is suspected. Long-task timings in run 2 were 130, 91 and 53 ms.

I have not claimed any performance improvement: the cull has to be measured on the preview after the push.

## 6. Automated checks (commit `1981e5a`)

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | 0 errors, 9 warnings (unused variables, existing) |
| `npx vitest run` | 24 files, 274 tests pass (up from 263) |
| `npm run build` | Compiled; `/play` is 18.1 kB, 188 kB first load |

## 7. Known limitations

- **Not verified in the browser yet:** the 8 fixes above, until they are pushed and the preview is rechecked.
- **Performance:** below 60 FPS on High on an M2 in the shop district (31 FPS standing). The vehicle cull should help; how much is unmeasured. There is also a multi-second hitch at the start of a fast ride, cause not isolated.
- **No camera collision with trees:** a tree trunk can sit between the camera and the player.
- **No respawn for lost owned vehicles:** the showroom marks a bought vehicle "आपकी" (yours) and has no way to call it again if it is lost.
- **GPS routes off-road destinations to the nearest road node:** so a shop door can be reported as a few hundred metres away by road.
- **Not implemented (unchanged from the Phase D report):** rain and wet roads, screen-space reflections, texture- and reflection-quality settings, breakable props, recorded shopkeeper voices, gameplay footage.
- **QA tooling:** a click on the canvas opens Vercel's preview-toolbar comment mode. No comment was submitted; one draft was discarded with Escape.
- **Screenshots:** only the main-menu capture was saved as a file. The other screenshots were viewed during testing but are not filed.
