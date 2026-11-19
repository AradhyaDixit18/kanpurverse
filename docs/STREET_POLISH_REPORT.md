# Street polish pass: wheels, camera, wildlife, capture rig

Date: 19 November 2026 · Branch: `feature/street-polish-wheels-wildlife` (from `main` at `76b610f`)

## Status

Tested on the Vercel preview for branch `street-polish` in desktop Chrome on 19 November 2026 (Apple M2, Chrome 157,
1470×745, High preset). 319 unit tests pass; typecheck, lint and the production build pass.

Same 19 s keyboard route as the baseline below, High preset, Day:

| Measure | Before (`76b610f`) | After (preview `440c45f`) |
|---|---|---|
| Average | 54.6 FPS | 58.5 FPS |
| p95 / p99 frame | 33.3 / 34.2 ms | 18.7 / 33.4 ms |
| Worst frame | 83.4 ms | 35.4 ms |
| Frames over 33 ms / over 50 ms | 43 / 2 | 11 / 0 |
| 1% low | 23.2 FPS | 29.0 FPS |
| Long tasks | one, 51 ms | none |

Seen working on the preview: wheels planted in their arches, capture cameras, autopilot, the fruit cart gone from the
parked hatchback, cattle on the verge, hand-drawn facades, four distinct Hindi shopfronts, clouds, flowering trees,
dashed centre lines, the Velto Petroleum fuel station by day and by night, the new vehicle names.

Art pass added after the first report: `facadeArt.ts`, `foliage.ts`, `PetrolPump.tsx`, sky clouds and golden-hour
haze, dashed lit centre lines, new vehicle names, Kartik Tommy as a second lead look in the character studio.

Still stylised, not photoreal: vehicles, characters and animals are low-polygon models built in code.

## Reference reel (instagram.com/reel/Df4qLwtCYV-, 72 s, another studio's Bengaluru game)

Observed, not copied. Time codes are from the reel.

| Time | What is on screen |
|---|---|
| 0–2 s | Rear chase of a motorbike under flowering trees; viewer comments overlaid |
| 3 s | High chase over a bus roof down a divided road, shopfronts both sides |
| 6, 15 s | Black title cards, two short lines of spaced capitals |
| 10 s | Night rain, auto-rickshaw from behind, wet road reflecting headlights and shop lights |
| 20 s | Ground-level static shot at golden hour: haze, pigeons on the road, pedestrians on the footpath |
| 26–32 s | Aerial of an office block, then a straight-down drone shot of a junction and footbridge |
| 38 s | Close shopfront with Kannada and English signboards, lit interior |
| 44 s | Low angle up at a balcony through tree branches |
| 56–62 s | Night street with bunting and wet tarmac, then an auto-rickshaw driving away |
| 68–72 s | End card: logo in a rounded frame over an aerial, "coming soon", button, URL |

Seen: long lenses and low cameras, one clear subject per shot, haze and wet-road reflections carrying the lighting,
cuts every 3–6 s with title cards as punctuation, small living details (birds, bunting, signboards) in most frames.
Not knowable from the reel: how the controls feel, frame rate in play, or how much is a scripted camera.

## Baseline (production, `76b610f`, before this branch)

Apple M2 (ANGLE Metal), Chrome 157, window 1470×745, device pixel ratio 2 (High preset caps the render at 1.5),
High preset, atmosphere Day. Hatchback `v_hatch_1` from its parking spot at Cafe Chowk. Keys were sent as
`keydown`/`keyup` events on `window`: W 5.0 s, W+D 1.4 s, W 3.0 s, W+A 1.4 s, W 3.0 s, S 1.8 s, S 2.2 s, none 1.2 s.

| Measure | Value |
|---|---|
| Frames in the 19 s route | 1,039 |
| Average | 54.6 FPS |
| Median / p95 / p99 frame | 16.7 / 33.3 / 34.2 ms |
| Worst frame | 83.4 ms |
| Frames over 33 ms / over 50 ms | 43 / 2 |
| 1% low | 23.2 FPS |
| Long tasks during the route | one, 51 ms |
| Long tasks during load (Continue to playable) | 11, worst 629 ms, 2.0 s in total |

Defects seen on that drive:
- A fruit cart was generated inside the parked hatchback.
- The car reached 75 km/h in 3 s; the scripted right turn at speed left the road and hit a tree (−35 health).
- Behind the tree the canopy filled the frame: nothing stops the camera's view being blocked by foliage.
- Lane markings cross each other in an X at the junction; apartment blocks repeat one colour and window pattern.
- Animals: on a fixed atmosphere the world clock does not advance, and the old animal code ran on that clock.

## What changed

**Wheels and suspension** (`suspension.ts`, `vehicleModels.tsx`)
- The chassis pitches and rolls; wheels no longer tilt, float or sink with it. Wheel centres stay on their axles and
  the tyre's lowest point stays at road height (tested for all 18 vehicles). Arch closure is limited to 5 cm.
- Two-wheelers lean about the tyre contact line, not the body centre; riders lean with the frame.
- The cycle rickshaw no longer leans like a bike.
- Front wheels show the road-wheel angle the tyre model is using (lock fades with speed).
- Wheel spin already followed signed speed (reverse included, none at rest); the angle is now wrapped.

**Smoothness** (`Vehicles.tsx`, `Player.tsx`, `chaseCamera.ts`)
- The vehicle model is a child of its rigid body, so it is drawn at the pose interpolated between 60 Hz physics steps.
  Before, it was moved by hand inside the step and jumped a whole step on any frame that ran zero or two steps.
- The chase camera follows the drawn vehicle and uses a continuous boom: no teleport, and obstructions shorter than
  0.12 s are ignored while moving (poles and stalls the car passes).

**Input** (`input.ts`): a hidden tab, `pagehide`, the context menu and releasing Cmd all release held keys.
Key bindings are unchanged, so in-game labels are unchanged.

**Street props** (`propPlacement.ts`, `Props.tsx`): stalls and poles are not generated in a crossing road's lane, on a
parked story vehicle or on a standing character.

**Wildlife** (`wildlife.ts`, `Animals.tsx`)
- Desi cattle on the verge (6 m back from fast roads), street dogs on one footpath (never crossing a road), goats in
  small herds beside quiet lanes, pigeons with a third on the ground while the rest circle, crows on the street's own
  pole cross-arms, black kites circling high.
- Drawn inside 90–180 m and animated inside 55–120 m depending on the preset; nothing first appears within 22 m in
  front of the player.
- 15 instanced draw calls for all animals (cows and dogs were about 190). Real-time clock.

**Capture rig** (`cinematics.ts`, `qa/CinematicRig.tsx`): dormant unless the page is opened with `?capture=1`. Eight
capture cameras, portrait rendering at 1080×1920, canvas recording and a road-following autopilot. Capture cameras
never write to the gameplay camera. Motion blur is meant to be added in the edit (60 fps capture blended to 30 fps).

## Not verified (needs the Vercel preview in desktop Chrome)

1. Everything visual: animal proportions and poses, wheel and arch clearance, rider lean, the capture cameras.
2. That frame times on the baseline route are no worse. Repeat the route above with the same settings and compare.
3. Cold load, reload, stop-and-go, tight turns, hard braking, reverse, kerbs, collisions and recovery, tab switching.
4. Console and network on the preview.

## Not done

- The art pass: facades, Hindi signboards, shutters, balconies, kerbs, road and footpath textures, vehicle paint and
  glass, lighting and grading. This needs eyes on a GPU for every change, so it was not attempted blind.
- Camera view blocked by tree canopies; lane markings crossing at junctions; repeated apartment blocks.
- Deployment, the reel, and publishing.
