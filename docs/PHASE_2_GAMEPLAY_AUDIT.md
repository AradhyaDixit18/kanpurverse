# Phase 2 gameplay audit

8 November 2026. Baseline: `612e35f` on `codex/kanpurverse-stability-and-visual-overhaul`; clean tree at intake. No restart, reset, production change or unrelated-project access. User continuation directive is the Phase 2 scope; earlier 73-test repairs are retained.

Fresh `npm run verify` passed: **73/73 tests**, typecheck, lint (two existing warnings), production build. Evidence: `work/phase2/baseline.log`. These tests verify scoped behavior, not a finished browser game. Classification uses the user's functional categories; verification status is deliberately narrower than component presence.

| System | Functional classification | Actual evidence and limits | Source |
|---|---|---|---|
| Character movement | PARTIALLY IMPLEMENTED | Fixed-step KCC walk/run/sprint/jump passes real Rapier ground/wall fixtures; crouch absent; integrated city sweep pending. | Player.tsx; characterPhysics.ts; tests/physics.test.ts |
| Character animations | PARTIALLY IMPLEMENTED | Procedural pose blending exists; bounded turn lean verified. No point/crouch/public-object action state, seated attachment missing at audit start. | Avatar.tsx; protocol.ts |
| Character collision | PARTIALLY IMPLEMENTED | World walls/parked chassis work in fixtures. Remote avatars, ambient traffic/NPC/animals do not yet supply complete physical proxies. | Remote.tsx; Traffic.tsx; NPCs.tsx; Animals.tsx |
| Vehicle physics | PARTIALLY IMPLEMENTED | All ten categories pass basic Rapier handling/wall/contact tests; arcade yaw-only body, no suspension/tire solver or category masses. | Vehicles.tsx; driving.ts; tests/physics.test.ts |
| Vehicle entry/exit | PARTIALLY IMPLEMENTED | Server seat exclusivity passes. Baseline exits ignore obstacles and speed; repair milestone below adds checks. | room.ts; Player.tsx |
| Passenger seating | BROKEN / PARTIALLY IMPLEMENTED | Ownership/movement replicate, but passenger and driver avatars are hidden; there is no seated visual attachment. | Vehicles.tsx; Remote.tsx; Player.tsx |
| Vehicle AI | VISUAL ONLY / PARTIALLY IMPLEMENTED | Clock-based segment ping-pong, hard-coded height, local stop/teleport; no authoritative lane graph or complete contact. | Traffic.tsx; roads.ts |
| Pedestrian AI | PARTIALLY IMPLEMENTED | Sidewalk offsets and patrol/notice/talk/react exist; no obstacle-aware navigation or shared actor authority. | NPCs.tsx |
| NPC interactions | PARTIALLY IMPLEMENTED | Local dialogue/proximity prompts exist; tutorial mission/reward runs through real WebSocket test. Full dialogue choices not played through. | Dialogue.tsx; Missions.tsx; tests/multiplayer.test.ts |
| Animal behaviour | VISUAL ONLY / PARTIALLY IMPLEMENTED | Clock-based cows/dogs/birds and visual reactions; no collision navigation; buffalo/monkey/sparrow absent. | Animals.tsx |
| Railway systems | PARTIALLY IMPLEMENTED | OSM tracks/crossings, train timing and barrier colliders exist. Traffic does not integrate a shared crossing controller; no current end-to-end schedule/announcement test. | RailwayOsm.tsx; Railway.tsx |
| Missions | PARTIALLY IMPLEMENTED | 14 definitions; tutorial reward/profile integration passes. Seven newer playthroughs and 20 varied mission target remain unfinished. | shared/world.ts; room.ts; tests/multiplayer.test.ts |
| Economy | PARTIALLY IMPLEMENTED | Server-owned coin debit/rewards and repeat payouts tested; no vehicle economy/daily system. Valuable persistence operations are not transactional. | room.ts; storage.ts; shared/index.ts |
| Inventory | PARTIALLY IMPLEMENTED | Unlocked item arrays and shop exist. profile.update accepts appearance ranges without checking paid cosmetic unlocks: progression validation gap. | server/index.ts profile.update; HUD.tsx; shared/protocol.ts |
| Character progression | PARTIALLY IMPLEMENTED | XP/levels/unlocks saved in profiles; no coherent vehicle/location/return-player progression beyond missions and cosmetic shop. | shared/index.ts; storage.ts; room.ts |
| Multiplayer | PARTIALLY IMPLEMENTED | Real two-WebSocket join/chat/movement/seat/reconnect tests pass. Two current browser contexts and moving cross-client contact unverified; physics remains client simulated. | net/client.ts; server/index.ts; room.ts; tests/multiplayer.test.ts |
| Map | PARTIALLY IMPLEMENTED | OSM extract validator and anchor tests pass; lake/outer districts and elevation incomplete. Projection/footprints retained. | roads.ts; geo.ts; geographic audit |
| Audio | PARTIALLY IMPLEMENTED | Three MP3 tracks retained; missing/error audio silently falls back to a browser voice. No authentic-Kanpuriya-voice claim. | audio/voice.ts; audio/sfx.ts; dialogue manifests |
| User interface | PARTIALLY IMPLEMENTED | Menus/HUD/creator/map/shop/settings exist; garage informational, no full button/route/accessibility playthrough. | ui/Menu.tsx; HUD.tsx; Character.tsx; Settings.tsx |
| Mobile controls | PARTIALLY IMPLEMENTED | Input hold/rebind unit checks pass; nested touch-button identity and vehicle-exit visibility need repair; no physical device verification. | input.ts; HUD.tsx TouchControls; tests/input.test.ts |
| Performance | NOT CURRENTLY VERIFIED | Build route size recorded; historical FPS is not current evidence. No representative frame-time/heap/AI/network profile yet. | PERFORMANCE_REPORT.md; Game.tsx Fps |
| Database persistence | PARTIALLY IMPLEMENTED | File-backed reconnect test passes; production health historically reported mongo. Atlas write/restore unverified; numeric TTL timestamps and read/modify/write need review. | storage.ts; DATABASE_SCHEMA.md |

## Highest-priority reproducible defects

1. Exit uses a fixed offset, can place the capsule inside a wall, ignores speed, and offers no blocked-exit recovery. Reproduce: park against a wall and press F. Expected: clear alternative door or retain occupancy. Source: baseline `room.ts:exitVehicle`.
2. Occupants are hidden instead of sitting in a vehicle-local rig. Reproduce: enter with driver/passenger and observe from the other session. Source: visibility rules in `Player.tsx` / `Remote.tsx`; no occupant children in `Vehicles.tsx`.
3. Remote and ambient actors are visual-only collision participants. Reproduce: approach them with a player/vehicle. Source: groups without rigid bodies in the actor renderers. Broad multiplayer contact authority remains unfinished.
4. Ambient movement jumps after a hold and all vehicle types use y=.6. Source: `Traffic.tsx`; actual paths/height, not visual polish, need repair.
5. Cosmetic equip validation and social mission continuity are incomplete. The server validates appearance ranges but not purchases; the 60-second social mission timer does not continuously verify partner presence. These must be fixed before expanding valuable progression.

## Current repair evidence

Safe-exit tests now cover all ten categories against live Rapier walls, full enclosure, server seat retention, teleport/height rejection, movement gating and disconnect cleanup. `work/phase2/exit-tests.log`: 35 tests across exit/authority/existing multiplayer suites passed. Integrated browser evidence is recorded in `PHASE_2_QA_REPORT.md` as it is collected. Full traffic/navigation/production persistence remain unverified.
