#!/usr/bin/env bash
set -euo pipefail

TOOL_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/frantic-haxe-4.3.7"
NEKO_DIR="$TOOL_DIR/neko-runtime"

if ! command -v haxe >/dev/null 2>&1 && [ ! -x "$TOOL_DIR/haxe" ]; then
  mkdir -p "$TOOL_DIR"
  ARCHIVE="$TOOL_DIR/haxe-4.3.7-linux64.tar.gz"
  curl -fsSL --retry 3 \
    https://github.com/HaxeFoundation/haxe/releases/download/4.3.7/haxe-4.3.7-linux64.tar.gz \
    -o "$ARCHIVE"
  if ! tar -tzf "$ARCHIVE" >/dev/null 2>&1; then
    echo "El archivo oficial de Haxe 4.3.7 no es un tar.gz válido." >&2
    exit 1
  fi
  mkdir -p "$TOOL_DIR/unpacked"
  tar -xzf "$ARCHIVE" -C "$TOOL_DIR/unpacked"
  HAXE_BIN="$(find "$TOOL_DIR/unpacked" -type f -name haxe -perm -111 | head -n 1)"
  if [ -z "$HAXE_BIN" ]; then
    echo "No se encontró el compilador Haxe en el paquete descargado." >&2
    exit 1
  fi
  cp -R "$(dirname "$HAXE_BIN")/." "$TOOL_DIR/"
fi

if [ -x "$TOOL_DIR/haxe" ]; then
  export PATH="$TOOL_DIR:$PATH"
  export HAXE_STD_PATH="$TOOL_DIR/std"
  export HAXEPATH="$TOOL_DIR"
  if [ ! -x "$NEKO_DIR/neko" ]; then
    NEKO_ARCHIVE="$TOOL_DIR/neko-2.4.1-linux64.tar.gz"
    NEKO_UNPACKED="$TOOL_DIR/neko-unpacked"
    curl -fsSL --retry 3 \
      https://github.com/HaxeFoundation/neko/releases/download/v2-4-1/neko-2.4.1-linux64.tar.gz \
      -o "$NEKO_ARCHIVE"
    if ! tar -tzf "$NEKO_ARCHIVE" >/dev/null 2>&1; then
      echo "El archivo oficial de Neko 2.4.1 no es un tar.gz válido." >&2
      exit 1
    fi
    mkdir -p "$NEKO_UNPACKED"
    tar -xzf "$NEKO_ARCHIVE" -C "$NEKO_UNPACKED"
    NEKO_BIN="$(find "$NEKO_UNPACKED" -type f -name neko -perm -111 | head -n 1)"
    if [ -z "$NEKO_BIN" ]; then
      echo "No se encontró el runtime Neko en el paquete descargado." >&2
      exit 1
    fi
    mkdir -p "$NEKO_DIR"
    cp -R "$(dirname "$NEKO_BIN")/." "$NEKO_DIR/"
  fi

  NEKO_LIBRARY="$(find "$NEKO_DIR" -type f -name 'libneko.so*' | head -n 1 || true)"
  NEKO_BINARY="$(find "$NEKO_DIR" -type f -name neko -perm -111 | head -n 1 || true)"
  NEKO_MODULE="$(find "$NEKO_DIR" -type f -name std.ndll | head -n 1 || true)"
  if [ -z "$NEKO_LIBRARY" ] || [ -z "$NEKO_BINARY" ] || [ -z "$NEKO_MODULE" ]; then
    echo "La instalación de Neko no contiene el runtime, libneko.so y std.ndll esperados." >&2
    exit 1
  fi

  export PATH="$(dirname "$NEKO_BINARY"):$PATH"
  export LD_LIBRARY_PATH="$(dirname "$NEKO_LIBRARY")${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  export NEKOPATH="$(dirname "$NEKO_MODULE")"
  if [ -n "${GITHUB_PATH:-}" ]; then
    echo "$TOOL_DIR" >> "$GITHUB_PATH"
    echo "$(dirname "$NEKO_BINARY")" >> "$GITHUB_PATH"
  fi
  if [ -n "${GITHUB_ENV:-}" ]; then
    echo "LD_LIBRARY_PATH=$LD_LIBRARY_PATH" >> "$GITHUB_ENV"
    echo "HAXE_STD_PATH=$HAXE_STD_PATH" >> "$GITHUB_ENV"
    echo "HAXEPATH=$HAXEPATH" >> "$GITHUB_ENV"
    echo "NEKOPATH=$NEKOPATH" >> "$GITHUB_ENV"
  fi
fi

export HAXELIB_PATH="${HAXELIB_PATH:-$HOME/haxelib}"
mkdir -p "$HAXELIB_PATH"
haxelib setup "$HAXELIB_PATH"
