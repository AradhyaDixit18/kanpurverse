# Phase 2 renderer evidence

Original local integration-scene captures on 8 November 2026 (IST). They are real frames from the existing Game/Player/Vehicles/Rapier components and isolated WebSocket server; they are not AI-generated or a claim of a finished city overhaul.

- occupant-before.png: claimed driver was not rendered.
- occupants-after.png: hollow cabin with vehicle-local driver/passenger rigs.
- grounded-exit.png: on-foot exit after fixing the giant ground collider.
- shared-ride.webm: requested five-second capture of real throttle/steering/replicated occupants. Independent container duration/codec probe was unavailable; no extra application installed.

Run the isolated fixture from repo root with `npx tsx scripts/qa/server.ts`, then from apps/web use `NEXT_PUBLIC_WS_URL=ws://localhost:8790 NEXT_PUBLIC_QA=1 npx next dev -p 3002`. Open localhost:3002/qa/vehicles and 127.0.0.1:3002/qa/vehicles for independent origin storage. Production mode returns 404 for that route. The fixture is intentionally simple and is not a performance benchmark or complete city playthrough. Never provide MongoDB credentials to this QA server.
