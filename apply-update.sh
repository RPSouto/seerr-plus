#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-$PWD}"
PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

if [ ! -f "$SOURCE_DIR/package.json" ]; then
  echo "This does not look like the Seerr+ source directory: $SOURCE_DIR" >&2
  exit 1
fi

copy_file() {
  local relative_path="$1"
  local source_file="$PACKAGE_DIR/$relative_path"
  local target_file="$SOURCE_DIR/$relative_path"

  if [ ! -f "$source_file" ]; then
    echo "Missing package file: $relative_path" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$target_file")"
  cp "$source_file" "$target_file"
}

copy_file "SEERR_PLUS_VERSION"
copy_file "README.md"
copy_file "CHANGELOG-SEERR-PLUS.md"
copy_file "server/routes/moviefight.ts"

echo "Seerr+ v1.8.445 files applied to $SOURCE_DIR"
