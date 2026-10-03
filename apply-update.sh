#!/bin/bash
set -e

TARGET_DIR=$1

if [ -z "$TARGET_DIR" ]; then
  echo "Usage: ./apply-update.sh <target_directory>"
  echo "Example: ./apply-update.sh ~/Docker/Seerr-Plus"
  exit 1
fi

echo "Applying update to $TARGET_DIR..."

# Ensure target exists
mkdir -p "$TARGET_DIR"

# Clean old source directories to remove stale/renamed files that break typescript build
rm -rf "$TARGET_DIR/server" "$TARGET_DIR/src" "$TARGET_DIR/public" "$TARGET_DIR/scripts" "$TARGET_DIR/bin"

# Copy all updated files over
cp -r ./* "$TARGET_DIR/"

echo "Update applied successfully!"
