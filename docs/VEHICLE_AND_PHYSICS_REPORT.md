# Vehicle and physics report

8 November 2026. **PARTIALLY IMPLEMENTED.**

Ten shared vehicle specs now define the same dimensions, seat roots and exit candidates for client/server. Exit queries check ground, capsule clearance and passage in Rapier; server bounds candidate position and checks OSM building/water footprints, actors and vehicles. Door alternatives, stop-before-exit, blocked recovery and disconnect cleanup are under test. Server geometry does not yet include procedural infill/small props; detailed current-world clearance is client-side, so this is not full authoritative physics. Suspension/seat presentation and integrated browser matrix remain pending.

Status vocabulary: COMPLETED AND VERIFIED; IMPLEMENTED BUT NOT VERIFIED; PARTIALLY IMPLEMENTED; BLOCKED; NOT IMPLEMENTED.
