# Phase 3 QA / engineering report

8 November 2026. Overall PARTIALLY IMPLEMENTED. The complete game and Phase 3 are not finished.

## Verified baseline and preservation

Starting revision1ec07c1 on `codex/kanpurverse-stability-and-visual-overhaul`; remote dev matched; production main4ae52721a94ebeca70705552db8a588954a8caa6. `npm run verify` fresh127/127, typecheck, lint(two inherited warnings), production build. Output copies of Phase2 QA/vehicle/UI/plan reports hash-match the repository copies reviewed. No Claude export supplied/read this phase. Generated tracked TypeScript cache removed from Git tracking and ignored; source/user work retained.

## Implemented repairs and evidence

- Continuous rendering clock extrapolates between server snapshots, limits stale prediction to500 ms and smooths small corrections/midnight wrap. Render-only; mission/economy/server authority unchanged. All ambient actors/crossings read one shared value per frame. This fixes sample-and-hold motion, not local traffic stop/resume authority.
- One connected railway route/distance cache per geographic extract; station-stop schedule cached, evaluation shared per render-clock value. Coach world offsets no longer rotate twice; longX axis follows the sampled track; distinct positions at terminals; wheel axle orientation corrected. Doors animate from their actual closed origins rather than collapsing to x0; indexed refs avoid accumulation. Crossing posts have stable element identity. Full city train/crossing passage still pending.
- Shared bounded rounded geometry fixes oversized bevels on thin character parts, plus distant articulated proxies. Shared metre/seat roots unchanged. Detailed face/clothing/skinned-rig upgrade NOT IMPLEMENTED.
- Static opaque street props baked in64m culling cells with vertex colours/material/shadow settings retained. Text/lines/physics excluded. Road spatial index preserves old query membership/source order while avoiding full-map minimap scans. HUD excludes raw20Hz snapshot objects and raw clock changes from its subscription.
- Tile uploads stagger nearest-first, retain neighbours, release merged geometry/tree resources on unload; stationary quality changes refresh tile radius. Remaining synchronous geometry/prop rebuild stalls need worker/incremental work.
- Near facade relief uses at most12 selected buildings/tile within90m Medium/140m High; Low keeps far atlas. Original 4-layer instance kit + reproducibleGLB reference. Station footprint kind now uses brick palette, no generic shop overlay and9.6m inferred height where unmapped; known levels retained. Tower/sign visible in [Central after](screenshots/phase3/central-after.png). This is a stylised repair, not a surveyed station or enterable hall.
- DPR ceilings Low1/Medium1.25/High1.75; no forced pixelated adaptive scaling; hardware-bounded asphalt/ground texture anisotropy. No blanket4K or fakeKTX2. The existing post-processing/renderer context remains; changing quality does not recreate the GL context.

## Actual foreground browser measurements

CSS1280×720, local Next development build, one active game tab, real city, same spawn/camera for stationary runs. Clock/ambient actor positions differ between runs; these are descriptive single runs, not statistically controlled hardware benchmarks. Renderer totals include shadow and post passes. JSON files in screenshots/phase3 retain raw summaries; no outlier removal.

| Run | AvgFPS | p95 ms | p99 ms | Maxms | >33 ms | Mean calls | Mean triangles | Geometry resources |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Original art/code + diagnostics, Medium |59.90|23.9|27.7|31.2|0|1110.64|156503|3693|
| Renderer/clock/LOD repairs |60.04|22.4|28.1|30.2|0|1059.74|86371|1243|
| Static prop batching |60.03|22.7|26.9|39.5|1|729.20|93294|997|
| Final Medium + architecture + road/HUD fixes |60.05|20.5|25.7|30.1|0|731.80|214835|941|
| Final Low, DPR1 |60.03|22.9|29.4|34.4|1|257.74|46947|618|
| Final High, DPR1.75 |60.03|21.0|24.9|29.2|0|852.42|321306|1038|
| Walking intermediate repairs |59.64|21.4|29.0|72.0|6|578.24|69696|1073|
| Walking final Medium |59.84|19.9|27.4|64.5|2|576.44|144131|1012|

Final Medium has~34.1% fewer draw submissions and~74.5% fewer geometry resources than baseline while showing more architectural geometry. p95 decreased~14.2% in these stationary samples; median remains display-limited around16.7 ms. Triangle totals increased after adding architecture. GPU bytes/JS heap, initial load distribution, physical phones, integratedGPU/ordinary-laptop certification and long-drive percentiles were not measured. Walking held real W input for19s of a20s sample from spawn, ending near(472,-225.67), crossing a city tile boundary. Remaining64.5 ms worst frame means stutter is PARTIALLY repaired, not eliminated. No original moving baseline exists, so intermediate-versus-final walking is not advertised as an original-code comparison.

## Visual QA and scope

Actual landing/menu/creator/HUD inspected in CUA chat; saved world/model frames listed in PHASE_3_VISUAL_AUDIT.md. Ten current vehicle models loaded and inspected; see PHASE_3_VEHICLE_ASSET_QA.md for explicit failures of art acceptance. Original referenceGLB169336 bytes/1234 triangles/6 meshes decoded by GLTFLoader with finite vertices/normals/UVs, metric floor origin and expected bounds, then inspected in browser. It is a facade reference with a closed shell, not an enterable building. Khronos Validator/Blender roundtrip andKTX2 decoder not run.

Spatial review originally moved only the lightweight position ref; Sky used the legacy Player.Vector3, producing a black sky at distant review views. Reviewer now synchronizes both; that artefact was not a production sky failure. Existing city coordinates, roads and source OSM JSON unchanged.

Pending final verification / two-player notes are appended after execution. No production release, Atlas migration, credential change or paid service operation performed.

## Two independent browser sessions after renderer changes

COMPLETED AND VERIFIED for the existing isolated hatchback integration fixture: localhost:3002 and127.0.0.1:3002 used independent storage and identities Phase3_Driver / Phase3_Rider, connected to the isolated file-backed QA server8790. Both showed2 online, driver/passenger claims and visible occupants. Shared steering/drive changed identity heading to q≈(0,-.666,0,.746); braking reached0m/s. Both pages showed the same stopped vehicle p≈(352.54,.72,-306.13). Passenger exited at(352.06,0,-307.66), driver at(352.42,0,-304.53), both grounded with capsule centre≈.95010. Empty seats replicated. Saved [occupants](screenshots/phase3/shared-occupants.png) and [grounded exits](screenshots/phase3/shared-exits.png). No city-wide vehicle/contact, forced disconnect/background, public backend, Atlas or physical mobile verification is implied. No new video was recorded; Phase2 retained its real recording.

## Final local verification

COMPLETED AND VERIFIED: `npm run verify` exited0 with146/146 tests across15 suites, typecheck, lint(the same two inherited warnings) and production build. Log: work/phase3/final-verify.log. Production Next server smoke check: `/`200, `/play`200, `/qa/vehicles`404, `/qa/world`404, `/qa/assets`404. Diagnostic UI/routes remain development-only. `/play` first-load report≈152kB is not total engine/map/texture/audio loading. `git diff --check` passed. Local test servers stopped after verification; no production setting/data changed. Remote branch checks are recorded after push.

Code revision: [6f15a39](https://github.com/AradhyaDixit18/kanpurverse/commit/6f15a39). Final code review also replaced update-time geometry translations on distant limbs with stable joint groups (prevents accumulating transforms when animation props change), and aligned initial lightweight streaming position with the existing shared spawn. The measured profiles precede those two cleanup changes; no additional FPS gain is claimed for them. The complete verification suite was rerun afterwards and passed. Source OSM data, vehicle hull/seat specs and production main are unchanged.
