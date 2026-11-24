#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Rebuild Lime's CFFI binary with the same glibc as Vercel's AL2023 builder.
export LIME_REBUILD_NATIVE=1
"$ROOT/scripts/build-haxeflixel.sh"

cd "$ROOT"
VITE_HAXEFLIXEL=1 npm run build
