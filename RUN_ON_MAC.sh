#!/bin/bash
# One-command local run: game server (ws://localhost:8787) + web client (http://localhost:3000)
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js 20+ required (you have nvm: run 'nvm use 24')"; exit 1; }
[ -d node_modules ] || npm install
[ -f apps/server/.env ] || { cp apps/server/.env.example apps/server/.env; sed -i '' "s/^SESSION_SECRET=.*/SESSION_SECRET=$(openssl rand -hex 32)/" apps/server/.env; }
[ -f apps/web/.env.local ] || cp apps/web/.env.example apps/web/.env.local
echo "Starting KanpurVerse. Open http://localhost:3000 in Brave (two windows = two players). Ctrl+C stops both."
trap 'kill 0' EXIT
(cd apps/server && npm run dev) &
(cd apps/web && npx next dev -p 3000) &
wait
