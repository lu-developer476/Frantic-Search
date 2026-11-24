#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/install-haxe.sh"

haxelib install flixel --quiet
haxelib run lime setup -y

(
  cd "$ROOT/haxe/minigames"
  haxelib run lime build html5 -release
)

OUTPUT="$ROOT/haxe/minigames/export/html5/bin"
if [ ! -f "$OUTPUT/index.html" ]; then
  echo "La compilación HTML5 de HaxeFlixel no generó export/html5/bin/index.html." >&2
  exit 1
fi

rm -rf "$ROOT/public/haxeflixel"
mkdir -p "$ROOT/public/haxeflixel"
cp -R "$OUTPUT/." "$ROOT/public/haxeflixel/"
