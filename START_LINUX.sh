#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js 20+ erforderlich"; exit 1; }
echo "BLOCKBOUND ULTIMATE: http://localhost:${PORT:-3000}"
exec node server/index.js
