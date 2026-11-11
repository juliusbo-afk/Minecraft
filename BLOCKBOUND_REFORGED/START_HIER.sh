#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 18+ wird benötigt: https://nodejs.org/'
  exit 1
fi
printf 'BLOCKBOUND REFORGED: http://localhost:3000\n'
node server.js
