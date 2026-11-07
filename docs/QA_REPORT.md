# QA Report — v0.5, 7 Nov 2026

Environments: Linux sandbox (Node 22.23, Python 3.10, no GPU) for automated checks; **Brave on macOS (Apple Silicon)** via the Claude-in-Chrome extension for real-browser checks against the **public** build (https://kanpurverse.vercel.app ↔ wss://kanpurverse-server.onrender.com); GitHub Actions (Playwright + SwiftShader) for headless smoke screenshots.

## Automated — PASS
| Check | Command | Result |
|---|---|---|
| Type check (shared, server, web) | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` | 0 errors (2 warnings: unused import in Dust.tsx, extra dep in Props.tsx) |
| Unit tests: dialogue parity (54 ids × 3), moderation, world generation, protocol, origin allow-list, **geo anchors** | `npm test` | **19/19** |
| Multiplayer integration (real server + ws clients): join/see, movement, chat PII/profanity, leave, vehicle seat, **speed-tolerance + `correct` reconciliation** | `npm run test:multiplayer` | pass (in the 19) |
| OSM extract validation | `python3 scripts/geo/fetch_kanpur_osm.py --check` | OK (2,937 roads, 193 rails, 1,419 buildings, 49 crossings, 7 stations) |
| Production build | `next build` | `/` 108 kB, `/play` 149 kB first-load |
| Secret scan | `git grep` for `mongodb+srv`, `github_pat_`, `SESSION_SECRET=`, `.env` in tracked files | none tracked |
| CI | `.github/workflows/ci.yml` on push | green on `main` |

## Real-browser QA (Brave, public URL) — results
| # | Check | Status |
|---|---|---|
| 1 | Landing → language gate (English / हिंदी / कनपुरिया) → menu; menu blurb; Character studio with rotating lit avatar | COMPLETED AND VERIFIED |
| 2 | Play → loading stages with progress → world at 59–61 FPS; HUD shows real IST clock (18:46 → 19:02 during the session, matched the Mac clock) | COMPLETED AND VERIFIED |
| 3 | Real OSM streets at spawn (The Mall Road, Bada Chauraha), Hindi shop signs, hoardings, poles/wires, thelas, chai stall, parked cycles | COMPLETED AND VERIFIED (screenshot) |
| 4 | Compass strip: cardinal + nearest 4 landmarks, no overlap; objective diamond | COMPLETED AND VERIFIED after fix (v0.5.2) |
| 5 | Missions log (J): 14 missions, rewards, distances; Hindi/English | COMPLETED AND VERIFIED |
| 6 | NPC dialogue: Babloo greeting with Edge voice + subtitle (earlier session), idle barks ("Out this early? Chai first.", "Brutal heat today…") | COMPLETED AND VERIFIED |
| 7 | Movement WASD/Shift/Space, server reconciliation (no permanent desync after a rejected hop) | COMPLETED AND VERIFIED |
| 8 | Vehicles: hatchback + auto entered and driven, steering, speedo, R reset (earlier session); e-rickshaw/bus/truck/taxi | hatchback/auto VERIFIED; others IMPLEMENTED BUT NOT VERIFIED |
| 9 | Two public sessions: "2 online", chat both ways, emote + position sync, same dusk sky | COMPLETED AND VERIFIED (earlier session) |
| 10 | Railway crossing barrier + bell with server-clock train; Kanpur Central platforms + halted train with open doors | IMPLEMENTED BUT NOT VERIFIED in Brave (1.9 km from spawn; the QA walker was blocked by the collider bug below, fixed in v0.5.2 and awaiting re-run) |
| 11 | Animals: cows at spawn seen; dogs/pigeons/crows | cows VERIFIED; others IMPLEMENTED BUT NOT VERIFIED |
| 12 | Camera modes C (×4), look-back Q, photo mode P, inventory I | IMPLEMENTED BUT NOT VERIFIED (keys implemented; not exercised in Brave this session) |
| 13 | Phone/touch | NOT VERIFIED (no device this session) |
| 14 | Reconnect after server restart (Render redeploys on every push) | COMPLETED AND VERIFIED ("Reconnecting…" then resumed with same name/coins) |

## Bugs found and fixed this session (all in `main`)
| Bug | Cause | Fix | Commit |
|---|---|---|---|
| **Empty city**: grass only, no roads/buildings, 1,500 console lines in 10 s | Per-tile `<Suspense>` around tiles whose `useLoader` textures/troika font suspended; React retried every frame and the heavy geometry `useMemo` re-ran on each retry and never committed | Textures loaded once at `OsmCity` and passed down; labels in their own `Suspense` | 5e4fc35 |
| Invisible wall across The Mall Road at x≈499 | Building colliders were axis-aligned bboxes of footprints; a diagonal footprint's bbox covered the road | Trimesh colliders from the real wall geometry | 3f3105f |
| Compass labels overlapping | all landmarks within 1.8 km drawn | nearest 4, 92 px min spacing | a7a533c |
| Hydration error #418 on `/play` | pre-mount `LoadingScreen` read persisted language (server rendered English) | language-neutral splash before mount | 5e4fc35 |
| Ganga polygon (718 points, 100+ km) in the extract | OSM relation ring not clipped | Sutherland–Hodgman clip to ±5 km in the fetch script + `--check` | 5e4fc35 |
| Client crash "reading 'size'" on far tiles (v0.5) | degenerate geometry in far tile / HDRI swap | error boundaries, geometry guards, HDRI keyed by file | 7e41737 |
| Permanent movement desync after one over-tolerance hop | Δt measured since last message, not last accepted state | tolerance since last **accepted** + explicit `correct` | 1babae2 |
| Vehicle launched skyward on entry | body spawned inside the ground | per-kind spawn height + vertical velocity clamp | 1babae2 |
| Player sank through the world when OSM city replaced fallback | ground collider unmounted with the fallback | persistent `GroundCollider` + y-reset | 1babae2 |

## Open issues
- Render Free spins down after 15 min idle: first join after idle takes 30–50 s (loading screen says "Waking the server…"). $0 constraint; an always-on plan is a paid option that needs approval.
- MongoDB persistence is wired (`MONGODB_URI` → `storage:"mongo"`) but the Atlas M0 cluster was still "configuring" after 1.5 h, so the server runs on file storage in `/tmp` and **profiles reset on each Render deploy**. See FINAL_DEPLOYMENT_REPORT.
- The QA walker needs the trimesh-collider build (3f3105f) to reach the Nayaganj crossing and Kanpur Central; re-run items 10–12.
- Two ESLint warnings (cosmetic).
