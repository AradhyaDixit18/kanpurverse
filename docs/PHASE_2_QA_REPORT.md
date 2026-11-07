# Phase 2 QA report

8 November 2026. **PARTIALLY IMPLEMENTED.**

Fresh baseline: npm run verify passed 73 tests, typecheck, lint with two existing warnings, build. Safe-exit/authority/existing multiplayer subset: 35 tests passed (work/phase2/exit-tests.log). New actual Rapier fixtures exercise opposite-door selection and all-exits-blocked for all ten types. Browser two-player, seat visibility, mobile, recordings and matching-backend preview are still pending; no current 60 FPS or Atlas persistence claim. Evidence and results will be appended after execution.

Status vocabulary: COMPLETED AND VERIFIED; IMPLEMENTED BUT NOT VERIFIED; PARTIALLY IMPLEMENTED; BLOCKED; NOT IMPLEMENTED.

### Browser-discovered ground defect

COMPLETED AND VERIFIED in the local integration fixture: after a real network exit at Kanpur world coordinates, the legacy 8km ground cuboid made Rapier KCC ground snapping move the capsule down 0.2791m while reporting grounded=true. A real-WASM regression reproduced body centre y=0.67088 with that collider; smaller ground shapes passed. Replaced that single contact shape with nine streamed 128m tiles (stable overlaps, no visual world change), and refreshed collider/query transforms after authoritative placement. Five regressions cover tile seams and outer-city coordinates. Browser re-test: capsule centre y=0.95010 and player feet y=0.00 after exit. This fixes the cause rather than clamping/hiding the avatar.
