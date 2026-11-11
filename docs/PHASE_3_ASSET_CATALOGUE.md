# Phase 3 asset catalogue and pipeline

8 November 2026. PARTIALLY IMPLEMENTED. Individual file hashes/sizes: PHASE_3_ASSET_FILES.json (46 visual/font files, 6,934,183 bytes at intake). Audio is catalogued in its existing manifests and is outside that total. No shipped GLB/glTF/KTX2 files at intake. Model families below cover generated instances, not just files on disk.

| Family/source | Intake quality / missing work | Action |
|---|---|---|
| OSM mapped footprints + infill, OsmCity.tsx/worldGeometry.ts | Metric wall extrusion, same 256px window bay repeated, empty roofs, closed shops | Keep map; near modular relief + distant atlas + controlled palettes |
| Fallback City.tsx houses/apartments/market/temple/mall/college/garage/cafe | Primitives; not active when OSM loads, including cafe interior approximation | Audit fallback separately; do not mistake it for active enterable OSM cafe |
| Stations OsmCity.tsx | Solid box + applied arcades/domes, generic house window map, overlapping mapped shells | Purpose-built metric station kit; verified placement/track clearance first |
| Train/Crossing RailwayOsm.tsx; fallback Railway.tsx | Box coaches, weak bogies/windows, route CPU repeated per crossing | Cache route/schedule; art rebuild after track alignment QA |
| hatchback/sedan/SUV/taxi Vehicles.tsx | Original parametric box panels; Phase2 open cabins, basic wheels, no final cockpit | Preserve shared hull/seats; refine body mesh/interior separately |
| bike/scooter/auto/erickshaw Vehicles.tsx | Primitive silhouettes, simple rider surfaces | Original detailed metric GLBs after seat tests |
| bus/truck Vehicles.tsx | Basic cabin/cargo, no detailed dashboard/interior | Category-specific art QA; retain dimensions |
| Avatar.tsx players/NPCs/Crowd/occupants | Articulated primitives, oversized bevels on thin parts, no skinned skeleton/UV clothing | Bounded shared rounded geometry first; skinned rig remains pending |
| Props.tsx poles/wires/hoardings/bunting/thela/chai/cycle/rickshaw/cart/auto board | Many separate meshes; visual-only props and repeated clutter | Batch static opaque geometry; curated placement + colliders later |
| Animals.tsx cows/dogs/pigeons/crows | Primitive bodies/clock paths; no navigation/collision | Keep honest placeholder status; rigged original assets later |
| Trees in OsmCity/City | Low-poly crowns/trunks, limited species | Instanced trunk/crown variants + controlled LOD |
| Road/pavement/grass/dirt/concrete/plaster materials | Existing CC0 JPEG PBR subsets; facade blur is also geometry/filtering issue | Preserve attribution; texel-density/UV/filter validation before bigger files |
| HDR skies | Existing three CC0 environments, not game-authored sky photographs | Retain, bound environment switching |
| UI Brand.tsx / fonts / public/screenshots | Vector skyline, Noto OFL, historical gameplay captures | Keep identity; refresh only with verified current features |

## Reusable asset contract

Names `kv_<family>_<variant>_lod<N>`, metres, right-handed Y-up, origin at floor centre for architecture/characters; vehicles at existing shared chassis root, +Z forward. Import correction belongs in visual child group. Metadata: creator/source, licence/attribution, revision/hash, bounds, triangles, material count, texture sizes/colour spaces, LOD distance, pivots/anchors, collider reference and review status.

GLB preferred for external/artist meshes; Blender can import/export glTF. Preserve editable source where supplied. Check topology/finite positions/normals/UVs, metre bounds, winding, pivots, unique material count, animation names/rest pose and joint scaling. Validate with the Khronos glTF Validator before acceptance. Geometry and texture compression are gated by decoded bounds/material review; KTX2 requires a working decoder/transcoder configuration, not renamed JPEGs. No compressed pipeline claimed until decoded in a real browser. Use WebP for UI/colour where supported; keep normal/roughness data maps linear. Avoid blanket 4K.

Architecture built directly from code remains valid original source: deterministic seed, metric bounds, flat/rounded geometry tests, merged batches, explicit collision separation, consistent normals and resource disposal. A generated cube exported as GLB is not an art upgrade. No unlicensed model downloads or purchased assets authorized in this milestone.

Acceptance: inspect near/mid/far daylight and night, verify shadows, silhouette, contact, seats/doors/rig, compare Low/Medium/High frame-time samples, reject placeholders even if they load. Catalogue statuses must distinguish implemented/verified from planned.

## Implemented foundation in this batch

Original metric facade kit in facadeKit.ts, runtime instanced batches in FacadeDetails.tsx. Script `npx tsx scripts/assets/export-architecture.ts` produces `public/models/architecture/kv_shophouse_reference_lod0.glb` (169336 bytes,1234 triangles,6 meshes); source/metric bounds in PHASE_3_ARCHITECTURE_ASSET_QA.json. GLTFLoader decode tests and real browser asset inspection passed. This closed-shell reference is an artist/interchange check; runtime city uses the same source parts through instancing. No download is added to normal city startup for this reference. There is no skinned-character, KTX2, Blender roundtrip, full vehicle-model replacement or enterable-building pipeline claimed as completed. The GLB is not a finished shop interior.
