#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/install-haxe.sh"

# Pin the Haxe libraries used by the browser runtime so CI and production do
# not silently pick different framework releases.
haxelib install lime 8.3.2 --quiet
haxelib install openfl 9.5.2 --quiet
haxelib install hxcpp 4.3.2 --quiet
haxelib install flixel 6.2.1 --quiet

if [ "${LIME_REBUILD_NATIVE:-0}" = "1" ]; then
  if ! command -v dnf >/dev/null 2>&1; then
    echo "La reconstrucción nativa de Lime para Vercel requiere dnf (Amazon Linux 2023)." >&2
    exit 1
  fi

  # Vercel's Amazon Linux 2023 image uses glibc 2.34, while the published
  # Lime 8.3.2 lime.ndll requires GLIBC_2.35. Rebuild that native helper on
  # the actual deployment image rather than loading the incompatible binary.
  dnf install -y \
    gcc-c++ glibc-devel libstdc++-devel \
    alsa-lib-devel pulseaudio-libs-devel \
    libX11-devel libXext-devel libXi-devel libXrandr-devel libXinerama-devel \
    libglvnd-devel mesa-libGL-devel mesa-libGLU-devel

  haxelib install format --quiet
  haxelib install hxp --quiet
  haxelib git lime https://github.com/openfl/lime 8.3.2

  LIME_SOURCE_PATH="$(haxelib path lime | grep -m1 '/lime/git/src$' || true)"
  if [ -z "$LIME_SOURCE_PATH" ]; then
    echo "No se pudo resolver el checkout Git de Lime instalado por Haxelib." >&2
    exit 1
  fi
  LIME_REPO="${LIME_SOURCE_PATH%/src}"
  if [ ! -f "$LIME_REPO/project/README.md" ]; then
    echo "No se encontró el código fuente C++ de Lime en $LIME_REPO." >&2
    exit 1
  fi

  git -C "$LIME_REPO" submodule sync --recursive
  git -C "$LIME_REPO" submodule update --init --recursive
  haxelib run lime rebuild tools
  haxelib run lime rebuild cpp -64 -release -clean

  LIME_NATIVE="$LIME_REPO/ndll/Linux64/lime.ndll"
  if [ ! -f "$LIME_NATIVE" ]; then
    echo "Lime no generó ndll/Linux64/lime.ndll para la imagen de Vercel." >&2
    exit 1
  fi
  if readelf --version-info "$LIME_NATIVE" | grep -q 'GLIBC_2\.35'; then
    echo "El lime.ndll recompilado sigue requiriendo GLIBC_2.35; no se publicará un build incompatible." >&2
    exit 1
  fi
  if ldd "$LIME_NATIVE" | grep -q 'not found'; then
    echo "El lime.ndll recompilado tiene dependencias nativas sin resolver:" >&2
    ldd "$LIME_NATIVE" >&2
    exit 1
  fi
fi

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
