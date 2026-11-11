# Vehicle and physics report

8 November 2026. **PARTIALLY IMPLEMENTED.**

Ten shared vehicle specs now define the same dimensions, seat roots and exit candidates for client/server. Exit queries check ground, capsule clearance and passage in Rapier; server bounds candidate position and checks OSM building/water footprints, actors and vehicles. Door alternatives, stop-before-exit, blocked recovery and disconnect cleanup are under test. Server geometry does not yet include procedural infill/small props; detailed current-world clearance is client-side, so this is not full authoritative physics. Suspension/seat presentation and integrated browser matrix remain pending.

Status vocabulary: COMPLETED AND VERIFIED; IMPLEMENTED BUT NOT VERIFIED; PARTIALLY IMPLEMENTED; BLOCKED; NOT IMPLEMENTED.

### Browser-discovered ground defect

COMPLETED AND VERIFIED in the local integration fixture: after a real network exit at Kanpur world coordinates, the legacy 8km ground cuboid made Rapier KCC ground snapping move the capsule down 0.2791m while reporting grounded=true. A real-WASM regression reproduced body centre y=0.67088 with that collider; smaller ground shapes passed. Replaced that single contact shape with nine streamed 128m tiles (stable overlaps, no visual world change), and refreshed collider/query transforms after authoritative placement. Five regressions cover tile seams and outer-city coordinates. Browser re-test: capsule centre y=0.95010 and player feet y=0.00 after exit. This fixes the cause rather than clamping/hiding the avatar.

## Occupant rigs and camera

PARTIALLY IMPLEMENTED overall; hatchback local two-player integration COMPLETED AND VERIFIED. Drivers/passengers now render as children of the same predicted/interpolated vehicle transform, using shared kind-specific seat roots and distinct positions. Their standalone avatars remain hidden and colliders disabled while occupied. Remote standalone avatars also consult immediate vehicle occupancy to avoid a duplicate before the next snapshot. Seated animation initializes in its seated pose; first-person camera uses the same seat definition and hides the local seated head.

The solid car cabin block was replaced with a roof/pillars and clear window material, bus/truck cabins were hollowed, rickshaw benches lowered to the configured sitting height, and two-wheeler seat length adjusted for the rear rider. These changes retain original procedural assets and do not claim suspension, tire simulation or a final vehicle art pass. Other vehicle visual rigs need browser inspection. Exposed rider/head collision and collider/roof bounds remain open.

Server exit safety currently covers OSM footprint/water polygons, world bounds, players and chassis. Procedural infill, small props, railway scheduling and complete moving-entity authority remain gaps; real local exit clearance uses the full Rapier scene. This is not a complete server-authoritative physics engine.
