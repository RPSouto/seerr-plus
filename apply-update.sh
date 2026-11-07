#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"

if [ -z "$TARGET_DIR" ]; then
  echo "Usage: ./apply-update.sh <target_directory>"
  echo "Example: ./apply-update.sh ~/Docker/Seerr-Plus"
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "Target directory not found: $TARGET_DIR" >&2
  exit 1
fi

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Applying Seerr+ update from $PACKAGE_DIR to $TARGET_DIR..."

# Copy files over to target directory
cp -a "$PACKAGE_DIR"/. "$TARGET_DIR"/

# Remove stale moviefight file if present in target directory to ensure clean build
rm -f "$TARGET_DIR/server/routes/moviefight.ts"

echo "Update applied successfully to $TARGET_DIR!"
