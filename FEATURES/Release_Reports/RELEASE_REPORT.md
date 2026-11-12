# KanpurVerse production release — 11 November 2026

## Release
- Merged PR #1: https://github.com/AradhyaDixit18/kanpurverse/pull/1
- Merge commit: b37f576fa783f3f139fbb70c610042328ad8bd7f
- Both development branches are included: codex/kanpurverse-stability-and-visual-overhaul and feature/kanpuri-street-life-part2. The latter already contained the former, so one combined PR avoided duplicate changes.
- Open PR count after merge: zero.
- Previous production revision retained in pre-release-main.txt and Git history. No branch or existing file deleted.
- GitHub still reports ownership as AradhyaDixit18/kanpurverse; transfer acceptance is not verified. No personal authentication credentials changed.

## Production deployment
- Play: https://kanpurverse.vercel.app/play
- Vercel production deployment: https://vercel.com/aradhu74s-projects/kanpurverse/7MnNxaUEDCHdDkQJJSrKn2NyPJFr
- Vercel showed Ready, Production, main, b37f576 and assigned kanpurverse.vercel.app.
- Render service: srv-dbneebou01pc73chh84g; https://kanpurverse-server.onrender.com
- Render showed Live and last successfully deployed commit b37f576. Automatic deployment finished in 48.4 seconds.
- No hosting plan, security setting, secret or payment setting changed.

## Validation
- PR verification succeeded: https://github.com/AradhyaDixit18/kanpurverse/actions/runs/43005536353
- Merged-main verification succeeded: https://github.com/AradhyaDixit18/kanpurverse/actions/runs/43006028828
- Existing validation suite: typecheck, lint, 168 tests across 20 suites, production build. Two inherited lint warnings were documented in the feature delivery.
- Real production Chrome session loaded the world and connected to the deployed multiplayer server.
- Walked to Nukkad Paan Chacha using normal controls and opened interaction.
- Purchased one packet: coins 200 -> 195, inventory 0 -> 1.
- Consumed packet: inventory 1 -> 0; live consumption action completed and control resumed.
- Spitting reduced civic score 100 -> 99.
- Funny Hindi category produced player line “का गुरु, आज तो पूरे हीरो लग रहे!” and NPC comeback “हीरो तुम हो, हम तो साइड में चाय पी रहे!” Hindi rendered correctly.
- Clean-language setting was checked by default, successfully toggled off, then restored on.
- Production city graphics and HUD visibly rendered.
- Vehicle driving/exit and mission start were verified in the earlier local feature QA, not repeated to completion in this production smoke test. No claim of exhaustive live regression testing.

## Instagram
- Official reel: https://www.instagram.com/velto_studios/reel/DfmRWX2PaXq/
- Published comment: https://www.instagram.com/p/DfmRWX2PaXq/c/17991317013071267/
- Comment author verified as velto_studios. Exact live /play URL and public-release update were visible after reload.
- Screenshot: release-comment-proof.jpg
- The original reel caption accurately described its status when published; the new dated UPDATE comment announces that these changes are now public.

## Remaining limitations
- This is an early browser-game build; no claim of perfection or exhaustive device compatibility.
- Free Render instances sleep and may need 50 seconds or more to wake.
- NPC mood/visual reactions and spit decals retain their documented lightweight local implementation; this release does not add full synchronized NPC simulation.
- Optional DCO check reported missing historical Signed-off-by trailers. GitHub branch had no enforced protection and accepted the normal merge; no signoffs were fabricated and no checks/settings were bypassed or disabled.
- Vercel reported five build warnings while successfully deploying. Further optimization and broader mobile/multiplayer load testing remain future work.
