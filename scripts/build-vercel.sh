#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/scripts/build-haxeflixel.sh"
cd "$ROOT"
VITE_HAXEFLIXEL=1 npm run build
