#!/bin/bash
# Single-player client only. Archived multiplayer service is not required.
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js 20+ is required"; exit 1; }
[ -d node_modules ] || npm install
echo "Starting solo KanpurVerse at http://localhost:3000/play. Ctrl+C stops it."
npm run dev:web
