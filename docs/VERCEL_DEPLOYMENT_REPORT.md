# Vercel Deployment Report

**Status: BLOCKED in this session** (no browser; Vercel's API/CLI login needs a browser or token). Production release additionally **WAITS FOR APPROVAL** per your rules. Configuration is complete and verified by a local production build.

## What Vercel hosts
Only `apps/web` (landing page + game client). The game server is a long-lived WebSocket process, which Vercel functions cannot run, so it is deployed separately (below).

## Preview deployment — steps (Mac, Brave, personal Vercel account)
1. Push the repo to GitHub (see GITHUB_DEPLOYMENT_REPORT).
2. Brave → https://vercel.com/new → Import `AradhyaDixit18/kanpurverse`.
3. Settings:
   - **Framework:** Next.js · **Root Directory:** `apps/web` · enable "Include source files outside of the Root Directory" (default on) so `packages/shared` and `assets/dialogues` are available.
   - **Install:** `npm ci` (run at repo root — Vercel does this automatically for workspaces) · **Build:** default `next build`.
   - **Environment variable:** `NEXT_PUBLIC_WS_URL = wss://<your game server host>` (for a first preview you can leave it unset; the client will show "Couldn't connect" with the URL it tried, which proves the page works).
4. Deploy → you get `https://kanpurverse-<hash>-<user>.vercel.app` (preview). Git `main` auto-deploys are disabled in `vercel.json` until you approve production.
5. Production: in Vercel, Promote to Production, then flip `robots` in `app/layout.tsx` to index and remove the `X-Robots-Tag: noindex` header in `vercel.json`. **Needs your approval.**

Alternative CLI: `npm i -g vercel && vercel login && cd apps/web && vercel` (preview) / `vercel --prod`.

## Game server hosting ($0 options; pick one, all need the browser to sign up)
| Option | Free tier | Caveat |
|---|---|---|
| **Render** (`deployment/render.yaml`) | 750 h/month web service | Sleeps after 15 min idle → first player waits ~30 s; fine for preview |
| **Fly.io** (`deployment/fly.toml`) | Small allowance | Needs a card on file → **requires your approval** |
| **Railway** | Trial credit | Credit expires |
| **Oracle Cloud Always-Free VM** | 4 OCPU ARM, 24 GB | Most work; truly free; run `docker run -p 8787:8787 -v kv:/data --env-file .env <image>` behind Caddy for TLS |
| **Your Mac + Cloudflare Tunnel** | free | Only while the Mac is awake; great for a demo session |
Server env: `SESSION_SECRET` (random 64 hex), `ALLOWED_ORIGINS=https://<vercel-url>`, `MONGODB_URI` (optional), `PORT` from host. Health check path `/health`.

## Checklist before production (approval gate)
- [ ] Voice mp3s generated and committed
- [ ] Manual QA (docs/QA_REPORT.md) passed on Mac + one phone
- [ ] MongoDB Atlas connected (`/health` → `"storage":"mongo"`)
- [ ] Server on a non-sleeping host with `wss://`
- [ ] `ALLOWED_ORIGINS` set to the production domain only
- [ ] robots/noindex removed
- [ ] Your explicit "go" for production
