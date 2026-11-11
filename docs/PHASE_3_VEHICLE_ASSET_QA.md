# Phase 3 vehicle asset QA

8 November 2026. Overall art overhaul: NOT IMPLEMENTED. Existing original procedural assets retained; no hull/seat spec changed in this batch. All ten categories were inspected in the development-only asset viewer after waiting for its rendered-asset readiness marker. First rapid-switch captures were discarded because a reused preview component could detach materials on kind changes; keying the preview by kind and waiting for readiness corrected the review tool. This was not a kind-switching bug in live spawned vehicles (their kind is immutable).

[Contact sheet](screenshots/phase3/vehicle-contact-sheet.jpg), individual `vehicle-<kind>.png` frames. These are static model inspections, not driving or occupancy certification.

| Category | Observed art defects | Acceptance |
|---|---|---|
| Hatchback | Rectangular silhouette, no sculpted body panels, no dashboard/door detail; wheel rims too simple | NOT ART-APPROVED |
| Sedan | Same box kit extended, weak bonnet/boot silhouette | NOT ART-APPROVED |
| SUV | Taller cuboid cabin, no category-specific wheel arches or fascia | NOT ART-APPROVED |
| Bike | Block seat/body, skeletal fork/handlebar, no detailed engine/frame | NOT ART-APPROVED |
| Scooter | Similar to bike, apron and bodywork too crude | NOT ART-APPROVED |
| Auto | Correct recognisable category/canopy colour, block lower body, weak wheels/dashboard | NOT ART-APPROVED |
| E-rickshaw | Roof/posts/bench primitive; no detailed controls, wires, mirrors or side panels | NOT ART-APPROVED |
| Bus | Open window band, box shell, missing detailed cabin/passenger seats/doors/route text | NOT ART-APPROVED |
| Truck | Bare cab frame, basic cargo box, no finished dashboard/grille/mirrors | NOT ART-APPROVED |
| Taxi | Sedan + roof sign; no differentiated taxi trim or cabin | NOT ART-APPROVED |

VehicleMesh materials now dispose with their owning model on unmount. Existing shared dimensions, entry/exit protocol and occupant poses remain intact. Twenty shared seat regressions and previous real Rapier/exit tests stay in the full suite. Current two-player integration re-test is recorded in PHASE_3_QA_REPORT.md. These asset inspections do not satisfy the requested high-quality replacement milestone.
