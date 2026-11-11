# KanpurVerse street-life update
Verified root: Desktop/VeltoStudios/KanpurVerse; package description explicitly identifies Velto Studios.
## Architecture audit
Next 15.5.29 / React 19.1.1 / TypeScript 5.9.3, R3F 9.3.0, Three 0.180.0, Rapier React 2.1.0. Player.tsx runs kinematic capsule movement and camera collision, input.ts unifies keyboard and touch (no existing controller support). Avatar.tsx provides procedural limb poses; no external character rig is needed. NPCs.tsx follows authored paths, resolves pedestrian contacts, greets and speaks. Existing Dialogue panel includes mission offers. HUD ShopPanel and Room.buy handle cosmetic unlocks and coins. Profiles persist through file/Mongo storage; no consumable inventory existed. Audio uses WebAudio SFX, recorded dialogue manifests, browser Hindi speech fallback. Real OSM Kanpur road/building/rail geometry loads through OsmCity; fallback City exists. Vehicles have independent predicted physics and server authority. Missions use server checkpoints.
## Preservation
Pre-existing dirty files retained. Git bundle, binary diff and untracked archive in FEATURES/Backups; dedicated feature branch. Backups are local-only. Previous reel read-only.
## Plan
1. Extend optional profile inventory with old-save migration and server validation.
2. Add consume/spit protocol and action acknowledgements; lock incompatible player actions.
3. Use procedural packet/open/eat poses, swept Rapier segment rays, normal-aligned capped stains.
4. Extend existing vendor dialogue/shop and add a fictional paan kiosk beside spawn.
5. Configurable Hindi categories, individual mood/cooldown, escape/de-escalation, clean setting.
6. Run type/lint/unit/integration checks and actual browser play; record actual gameplay after checks.
7. Produce 9:16 reel using previous red/gold/charcoal and Mukta branding, honest early-build labels.
8. Verify GitHub transfer destination and official Instagram before publishing.
