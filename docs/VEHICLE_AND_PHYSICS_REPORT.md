# Vehicle and physics report

8 November 2026. **PARTIALLY IMPLEMENTED.**

Ten shared vehicle specs now define the same dimensions, seat roots and exit candidates for client/server. Exit queries check ground, capsule clearance and passage in Rapier; server bounds candidate position and checks OSM building/water footprints, actors and vehicles. Door alternatives, stop-before-exit, blocked recovery and disconnect cleanup are under test. Server geometry does not yet include procedural infill/small props; detailed current-world clearance is client-side, so this is not full authoritative physics. Suspension/seat presentation and integrated browser matrix remain pending.

Status vocabulary: COMPLETED AND VERIFIED; IMPLEMENTED BUT NOT VERIFIED; PARTIALLY IMPLEMENTED; BLOCKED; NOT IMPLEMENTED.

### Browser-discovered ground defect

COMPLETED AND VERIFIED in the local integration fixture: after a real network exit at Kanpur world coordinates, the legacy 8km ground cuboid made Rapier KCC ground snapping move the capsule down 0.2791m while reporting grounded=true. A real-WASM regression reproduced body centre y=0.67088 with that collider; smaller ground shapes passed. Replaced that single contact shape with nine streamed 128m tiles (stable overlaps, no visual world change), and refreshed collider/query transforms after authoritative placement. Five regressions cover tile seams and outer-city coordinates. Browser re-test: capsule centre y=0.95010 and player feet y=0.00 after exit. This fixes the cause rather than clamping/hiding the avatar.
