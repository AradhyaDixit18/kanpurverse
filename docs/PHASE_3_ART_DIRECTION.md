# KanpurVerse art direction — 8 November 2026

Target: grounded, warm, readable stylisation on ordinary laptops. This is an original city interpretation, not a photorealistic replica or a promise of console fidelity. Keep the real OSM projection and road geometry. Use warm lime plaster, dusty brick, concrete lintels, painted metal shutters, deep window reveals, shaded verandas and modest rooftop equipment. Vary era/function/proportions, not random saturated colours.

## Visual language

Architecture: residential plaster + parapets + balcony rails; commercial ground-floor signage/awnings + shaded upper windows; public buildings deliberate entrance hierarchy; station terracotta/cream arcade kit. Use 3.2m floor modules, doors 1–1.4m wide / 2.2–2.5m high, rails about 1.05m. These are design dimensions, not surveyed Kanpur dimensions. Avoid baking all architecture into a stretched bitmap. Preserve mapped footprints; invented infill must remain labelled approximation.

Characters: consistently stylised Indian appearances, adult height around 1.7–1.85m, understated cloth, rounded but bounded anatomy. Maintain current seat/physics roots while upgrading visuals. A proper skinned GLB + animation set remains a separate asset milestone; do not call the current articulated primitives a completed skeleton pipeline.

Vehicles: familiar category silhouettes, original unbranded bodywork, matte rubber, restrained paint highlights, transparent glass, visible seated people, metric wheel/seat anchors from shared specs. Separate mesh import pivots from hull dimensions. No collider changes just to fit an asset. All ten categories require seat, wheel, cockpit and silhouette QA.

Lighting/materials: neutral daylight and warm evening; restrained emissive shop lights, night readability, soft near shadows. Concrete/plaster roughness .8–1, rubber .9, painted metal .35–.6, glass restrained. Keep linear data maps separate from sRGB colour. Never darken screenshots to disguise geometry. Reference daylight/time/settings must accompany comparisons.

Vegetation/streets: mixed foliage silhouettes with distant instancing, shade at walking scale, kerbs, drains, small shop clutter and purposeful gathering points. Tea tools, shutters, delivery crates, chairs, wiring and public notices should explain a place. Add details in bounded distance bands, not thousands of individual always-active React meshes.

## Proposed budgets (targets, not measured achievements)

| Budget | Low | Medium | High |
|---|---:|---:|---:|
| DPR ceiling | 1 | 1.25 | 1.75 |
| Near facade detail distance | 0–40m | 90m | 140m |
| Shadow map | off | 1024 | 2048 |
| Visible triangles | 150k | 350k | 650k |
| Main-view draw calls | 250 | 450 | 650 |
| Shared repeating texture | 512px | 1024px | 1024px |
| Hero texture per surface | 1024px | 2048px | 2048px |

Post-processing and shadow passes count separately in diagnostics. Profile stationary, walking, driving, tile transitions and two players. Frame median/p95/p99/max and >33 ms frames matter alongside average FPS. Budget overruns must be documented before richer assets expand scene cost.

## Reference sources and limits

Official district tourism: https://kanpurnagar.nic.in/tourist-places/ and municipal reference https://kmc.up.nic.in/tourist-places.html identify landmarks including JK Temple, Moti Jheel and Phool Bagh. Government tourism https://www.incredibleindia.gov.in/en/uttar-pradesh/kanpur identifies Mall Road/Naveen Market/Civil Lines and the reservoir. Read 8 November 2026. These references support identity/material research, not surveyed facade dimensions, interior plans or reuse licences for their photography. No reference image/model copied into the game.

Renderer guidance: https://threejs.org/manual/pages/optimize-lots-of-objects.html explains mesh submission/merging costs. Actual local measurements, not that guidance, determine implementation choices.
