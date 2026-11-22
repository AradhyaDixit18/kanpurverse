# KanpurVerse upgrade audit and progress, 22 Nov 2026

Base: `AradhyaDixit18/kanpurverse`, branch `main`, commit `d03a04b`. The `velto-studios` GitHub organization has no `kanpurverse` repository.

## What the codebase is
- Next.js 15 app (`apps/web`) plus `packages/shared` (pure game data and rules). React Three Fiber, Rapier physics, Zustand store, Vitest.
- Real-map foundation already exists: `scripts/geo/fetch_kanpur_osm.py` projects OpenStreetMap (ODbL) into game metres. The committed `apps/web/public/geo/kanpur.json` covers central Kanpur (bbox 26.448 to 26.492 N, 80.318 to 80.368 E, about 5 km by 5 km): 2,937 roads, 193 rail ways, 1,419 buildings, 16 parks, 3 water bodies, 56 named POIs, 49 crossings, 7 stations.
- Graphics presets Low, Medium, High, Ultra, a day and night cycle, and a Ganga ghat scene already exist.
- Vehicles are 18 original designs with fictional names (for example "Velto Zing") by deliberate design, so no manufacturer name or logo is used.
- Multiplayer was removed. There is no weather system and no police pursuit on `main`.

## Baseline (before changes)
- 338 tests passing; `tests/groundCover.test.ts` failed to load because it imported a module that does not exist (`groundCover`, the file is `groundCoverData.ts`).

## Gaps against the brief
- Coverage stops at central Kanpur. Barra, Naubasta, Kalyanpur, Panki, Jajmau, IIT Kanpur and Bithoor are outside the extract.
- Only one fuel node in the extract (unnamed brand, no fuel tags) plus the invented Velto Petroleum. No fuel mechanics existed.
- No pursuit system, no real-model vehicles, no pedestrian-density tuning per neighborhood.

## Done in this pass
1. Fuel system (pure, tested): `packages/shared/src/fuel.ts`, `tests/fuel.test.ts` (20 tests).
   - Fuel type per vehicle kind: petrol, diesel, CNG, electric, or none (cycle rickshaw). Tank size and economy are typical class figures, rounded for balance. They are not manufacturer specifications.
   - Distance is scaled by 40 because the map is small; a full hatchback tank lasts about 15 km of map distance.
   - Wrong-fuel, full-tank, unavailable and not-enough-coins refusals, with no charge.
2. Runtime and HUD: `apps/web/src/game/fuelRuntime.ts`, `Vehicles.tsx`, `ui/HUD.tsx`.
   - Burn by distance and throttle, idle burn when standing, engine cuts out at zero, low-fuel and empty toasts, tank gauge, range, nearest station hint, `Y` to refuel while stopped inside a station. Tank levels are session-only, not saved.
3. Stations: Velto Petroleum (invented; also stocks CNG and a charge point in game) and the one OSM node, marked unconfirmed.
4. OSM pipeline: `fetch_kanpur_osm.py` now also fetches unnamed fuel and charging sites and writes a `fuel` list with brand, operator, services and a confirmed flag. Not run yet (see below).
5. Weather (new, off by default so the existing look is unchanged): clear, overcast, rain, fog. Setting: Settings, Weather.
   - `packages/shared/src/weather.ts` (pure, 7 tests): per-condition multipliers for sun, ambient light, fog distance, sky grey, cloud cover, rain, road wetness and tyre grip; changes ease in over a few seconds and roads dry slowly.
   - `Sky.tsx`: sky shader gets cloud cover and grey, sun disc fades under cloud, fog distance and colour follow the weather, sun and ambient light scale.
   - `Rain.tsx`: rain streaks in a box that follows the camera; count follows the effects quality.
   - `OsmCity.tsx`: road and pavement materials darken, turn glossy and reflect more in the wet.
   - Driving: grip is 12% lower on wet roads, braking distance grows on wet or loose ground, and the loose-surface slide threshold now applies to grass and dirt, not to wet tarmac.
6. Test fix: `groundCover.test.ts` import corrected.

## Verified
- `tsc --noEmit`: clean. `npm test`: 34 files, 375 tests pass. `npm run build`: succeeds.
- Lint: 0 errors; the 9 warnings were already present.

## Not verified
- In-game behaviour was not run in a browser (no browser available to the build environment). Fuel burn rates, the gauge layout, the `Y` prompt, the rain look, the grey sky and wet-road gloss all need a play test. The sky shader edits were reviewed by hand and compile in the type check only as a string.

## Blocked or not done
- Fetching real fuel stations: the Overpass main server returned 406 to the browser and the fetch tool was refused by robots.txt or timed out. Run `python3 scripts/geo/fetch_kanpur_osm.py` on a normal connection, then feed `fuel` into `FUEL_STATIONS`.
- Real Indian vehicle models and brand names (Swift, Creta, Splendor and so on): not added. They are trademarked and the game deliberately uses original designs. Needs a decision.
- Police pursuit, rain sound, traffic that slows in rain, sheltered areas without rain, neighborhoods beyond the current bbox, per-street architecture, pedestrian density tuning, performance profiling before and after.
- Fuel prices are in-game constants, not live prices.


## Pass 3, 23 Nov 2026: trees, and the first real browser test

### Visual testing setup
- The game was run in a GitHub Codespace on the user's account and opened in Chrome through its forwarded port. Changes were carried over on the throwaway branch `visual-test-weather-fuel` (one archive file, `kv_changes.tgz`); `main` was not touched.
- Checked in the browser: landing page, language picker, main menu, Settings (new Weather and Season options present), gameplay. Rain streaks, grey sky and wet roads render. Frame rate held at 59 to 60 fps on Medium.
- The only console error is a hydration warning caused by a browser extension (`data-qb-installed` on `<html>`), not by the game.

### Trees (new)
- `packages/shared/src/trees.ts` (17 tests): ten species (neem, peepal, banyan, mango, ashoka, gulmohar, amaltas, jamun, eucalyptus, guava) with their own trunk height and colour, crown shape, greens, seasonal flowers and fruit. Mango, jamun and guava carry fruit with ripeness colours by season (raw green mangoes in summer, ripe in the monsoon; jamun green to purple-black). Banyans get aerial roots. Every crown clears 3.5 m so buses and the chase camera pass under street trees.
- Placement: street trees along primary to living-street roads in avenues (a stretch of road mostly shares one species), just beyond the carriageway, with neighbourhood-scale density variation; park trees fill OSM parks. Nothing is planted on a road, in a building, on rails, in water or in reserved gameplay areas; trunks are at least 7 m apart. Deterministic (the old park trees used Math.random and moved on every load).
- `apps/web/src/game/TreeSystem.tsx`: instanced trunks and branches, a dark inner canopy core, alpha-cut leaf-cluster cards (procedural leaf texture), and fruit; 96 m chunks streamed around the player, two chunk builds per frame, fruit drawn only within 70 to 95 m. Wind sway and leaf flutter in the vertex shader, driven by a new `wind` value in the weather model and gusting over time. Rain slant now follows the wind.
- Settings, Season: mango and jamun season (default), summer, winter, or the real calendar.
- `Boulevard.tsx` no longer plants its own road-edge trees (they duplicated the new system); its light pools stay.
- Measured in the browser near Cafe Chowk: 21 chunks, about 130 trees, 21,107 leaf cards, 336 fruit loaded (24 drawn), 60 fps.

### Fixes
- QA teleport hook (`__kv.hop`) did nothing on the player's dynamic body; it now sets the translation directly. In the last session it still failed right after a reload, so it needs another look.

### Verified
- `tsc --noEmit` clean, 35 test files and 392 tests pass, lint 0 errors, game runs in Chrome.

### Not verified or not done
- A close-up of fruit on a mango or jamun tree was not captured (the teleport problem above); fruit is loaded and counted in the scene but not visually inspected up close.
- The main street at the default spawn (700, -255) has few street trees; density there is low by the noise map and needs tuning.
- Vehicles are still original designs, not real models (decision pending). Photoreal characters, clubs and parties, cyclists, aircraft, new station architecture, building variety, the foot rendering issue the user reported, NPC schedules, physics overhaul, audio and UI overhaul are not started.


## Pass 4, 23 Nov 2026: collisions, minimal HUD

### Vehicles and people
- `apps/web/src/game/vehicleHits.ts` (11 tests). People on foot are in their own collision group that vehicles ignore, so a car is never stopped dead by a person as if by a wall. Each person reads the driven car's footprint every step: a car aimed at them makes them step aside (up to 3 m, then they hold their ground); a car that reaches them knocks them down. They are thrown along the car's path, fall over in 0.25 s, lie still for about 2 s, get up, and walk on. The car loses 18% of its speed, with a thud and (at most every 5 s) a warning toast. Applied to walking crowds and named NPCs; stall keepers who stand still keep solid colliders.

### Vehicles and trees
- Mature trunks (radius 0.16 m or more) near the player get fixed Rapier cylinders, so vehicles crash into them (the existing crash and damage code runs) and people walk around them. Colliders exist only within about 55 m and are freed as the player moves.
- Saplings and small trees bend when hit: the whole tree leans away along the car's path and springs back over about 3 s (shader, no per-tree CPU cost). The car loses 10% of its speed. Solid trees also shake slightly on impact.

### Minimal HUD
- Top-left card reduced to one line: money and time (plus fps when enabled). The chapter chip, level, save notice and logo are gone from the play screen; the gutka panel shows only when the player carries gutka. Vehicle controls show for 7 s after getting in; the keyboard hint shows for 12 s. Development panels need `?qa` in the URL.

### Fixes
- QA teleport (`__kv.hop`) now moves the kinematic body directly; the walking step was overwriting the target in the same frame.

### Verified
- 36 test files, 403 tests pass; `tsc` clean; lint 0 errors (9 pre-existing warnings); production build succeeds.
- In Chrome (Codespace): new HUD renders as described; no runtime errors from the new code.

### Not verified
- A live hit on a person or a tree was not captured in the browser: getting the test character into a vehicle from automation failed (the QA hooks read two different player-position objects). The behaviour is covered by unit tests only. A five-minute drive in the game is the real test.
- Physics tuning (grip, braking, suspension feel) was not changed this pass.
