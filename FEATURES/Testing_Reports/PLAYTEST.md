# KanpurVerse street-life validation — 11 November 2026

## Automated checks
- Full suite: **168 / 168 tests passed**, 20 files (`unit.log`). Includes existing multiplayer mission/reconnect and vehicle authority suites.
- New feature tests: purchase distance, old-save migration, repeat packets, affordability, cap, persistence, empty consumption, repeat consumption, early/repeat spit, vehicle restriction, mood escalation/apology/variation and clean-language replacement.
- TypeScript: passed. ESLint: zero errors; two existing warnings (landing image and Props useMemo dependency).
- Next production build: passed. Follow-up focused input/street tests passed after action-delivery hardening.

## Actual Chrome playtest
The game was run on this Mac in Chrome, using normal UI controls. It was not only inspected as source.

| Check | Observation |
|---|---|
| Startup / world | Loaded the OSM world and existing assets in development and production builds. |
| Walk / interaction | Walked from spawn (472,-330) to kiosk near (480,-326), then guide near (462,-336). |
| Shop | Three purchases changed coins 200 → 185 and packet quantity 0 → 3. A fourth purchase later changed 185 → 180. |
| Consume | Quantity decremented once. Packet/open/eat procedural poses are visible in recorded take 1. Input returns afterward. |
| Spit / geometry | First observed impact struck the kiosk-facing geometry; a later shot faced away and hit ground. Impact counter reached 2. |
| Consequence | Civic score 100 → 99 → 98; one nearby NPC said “अरे गुरु, सड़क है, पीकदान नहीं!” |
| Cleanup | A live state capture shows 1 stain; subsequent state shows 0 after expiry. Lifetime is 18 seconds, cap 24. |
| Hindi | Vendor text and dialogue categories render in Devanagari. |
| Variation / cooldown | Funny replies varied; immediate repeat click showed “अरे भाई, जवाब तो सुन लो!” |
| Mood / apology | Insult produced annoyed reply; apology produced “कोई बात नहीं गुरु, अब मुस्कुराओ!” |
| Language setting | Clean checked by default; unchecked mode produced “साला, फिर वही बकवास!”; restored to ON. |
| Existing dialogue / mission | Babloo retained directions and mission offers. Accepted “पहला कदम”; tracker appeared at checkpoint 1/3. |
| Vehicle | Entered existing scooter at (446,-340), drove and steered to roughly (367,-299), braked and exited successfully. |
| Persistence | Production-page reload retained 2 packets and civic score 98. |
| Errors | No new critical error was observed during the above interactions. This is bounded smoke coverage, not an all-world guarantee. |

## Measured performance
20.013-second foreground development sample: 1,131 frames; mean **56.51 FPS**, median frame 16.7 ms, p95 29.6 ms, p99 45.1 ms, max 64.9 ms. Medium quality, 1470×745 viewport, DPR 1.25; ~700 draw calls and 156k triangles/frame. Raw JSON is copied as `performance-sample.json`.

Other short samples varied substantially during development, HMR, recording and movement, including temporary low readings. There is no matched pre-change benchmark. Do not interpret this single sample as proof of no regression across all hardware. The recorder is development-only and is absent from the production UI.

## Not completed
Physical gamepad/mobile-device testing (no existing gamepad system); all 14 missions end-to-end; every camera/collider combination across the 5km world; sustained multiplayer replication of the new visual effects (they are local by design); cross-device performance baseline. Server unit tests cover empty inventory and rapid invalid actions; those negative paths were not all repeated manually in Chrome.
