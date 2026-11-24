#!/usr/bin/env bash
set -euo pipefail

if [ "${LIME_REBUILD_NATIVE:-0}" = "1" ]; then
  # Amazon Linux 2023 ships a Haxe build linked against its own glibc.
  # Vercel may expose the standard library path without adding the compiler
  # directory itself to PATH, so resolve the matching executable explicitly.
  if ! command -v haxe >/dev/null 2>&1; then
    HAXE_HOME=""
    if [ -n "${HAXE_STD_PATH:-}" ] && [ -x "${HAXE_STD_PATH%/std}/haxe" ]; then
      HAXE_HOME="${HAXE_STD_PATH%/std}"
    elif [ -d /opt/hostedtoolcache/haxe ]; then
      HAXE_BIN="$(find /opt/hostedtoolcache/haxe -type f -path '*/x64/haxe' -perm -111 2>/dev/null | sort -V | tail -n 1)"
      if [ -n "$HAXE_BIN" ]; then HAXE_HOME="$(dirname "$HAXE_BIN")"; fi
    fi
    if [ -z "$HAXE_HOME" ]; then
      echo "No se encontró el Haxe preinstalado de Vercel (HAXE_STD_PATH/toolcache)." >&2
      exit 1
    fi
    export HAXE_STD_PATH="$HAXE_HOME/std"
    export PATH="$HAXE_HOME:$PATH"
  fi

  for tool in haxe neko haxelib; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "Vercel debe proporcionar $tool para compilar HaxeFlixel." >&2
      exit 1
    fi
  done
  echo "Vercel Haxe: $(haxe -version)"
  echo "Vercel Neko: $(neko -version)"
else
  TOOL_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/frantic-haxe-4.3.7"
  NEKO_DIR="$TOOL_DIR/neko-runtime"

  if [ ! -x "$TOOL_DIR/haxe" ] || [ "$("$TOOL_DIR/haxe" -version 2>/dev/null || true)" != "4.3.7" ]; then
    mkdir -p "$TOOL_DIR"
    ARCHIVE="$TOOL_DIR/haxe-4.3.7-linux64.tar.gz"
    curl -fsSL --retry 3 \
      https://github.com/HaxeFoundation/haxe/releases/download/4.3.7/haxe-4.3.7-linux64.tar.gz \
      -o "$ARCHIVE"
    if ! tar -tzf "$ARCHIVE" >/dev/null 2>&1; then
      echo "El archivo oficial de Haxe 4.3.7 no es un tar.gz válido." >&2
      exit 1
    fi
    rm -rf "$TOOL_DIR/unpacked"
    mkdir -p "$TOOL_DIR/unpacked"
    tar -xzf "$ARCHIVE" -C "$TOOL_DIR/unpacked"
    HAXE_BIN="$(find "$TOOL_DIR/unpacked" -type f -name haxe -perm -111 | head -n 1)"
    if [ -z "$HAXE_BIN" ]; then
      echo "No se encontró el compilador Haxe en el paquete descargado." >&2
      exit 1
    fi
    cp -R "$(dirname "$HAXE_BIN")/." "$TOOL_DIR/"
  fi

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
    rm -rf "$NEKO_UNPACKED"
    mkdir -p "$NEKO_UNPACKED" "$NEKO_DIR"
    tar -xzf "$NEKO_ARCHIVE" -C "$NEKO_UNPACKED"
    NEKO_BIN="$(find "$NEKO_UNPACKED" -type f -name neko -perm -111 | head -n 1)"
    if [ -z "$NEKO_BIN" ]; then
      echo "No se encontró el runtime Neko en el paquete descargado." >&2
      exit 1
    fi
    cp -R "$(dirname "$NEKO_BIN")/." "$NEKO_DIR/"
  fi

  NEKO_LIBRARY="$(find "$NEKO_DIR" -type f -name 'libneko.so*' | head -n 1 || true)"
  NEKO_BINARY="$(find "$NEKO_DIR" -type f -name neko -perm -111 | head -n 1 || true)"
  NEKO_MODULE="$(find "$NEKO_DIR" -type f -name std.ndll | head -n 1 || true)"
  if [ -z "$NEKO_LIBRARY" ] || [ -z "$NEKO_BINARY" ] || [ -z "$NEKO_MODULE" ]; then
    echo "La instalación de Neko no contiene el runtime, libneko.so y std.ndll esperados." >&2
    exit 1
  fi

  export PATH="$TOOL_DIR:$(dirname "$NEKO_BINARY"):$PATH"
  export HAXE_STD_PATH="$TOOL_DIR/std"
  export HAXEPATH="$TOOL_DIR"
  export LD_LIBRARY_PATH="$(dirname "$NEKO_LIBRARY")${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  export NEKOPATH="$(dirname "$NEKO_MODULE")"

  if [ "$("$TOOL_DIR/haxe" -version)" != "4.3.7" ]; then
    echo "Se esperaba Haxe 4.3.7, pero el compilador instalado no coincide." >&2
    exit 1
  fi

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
