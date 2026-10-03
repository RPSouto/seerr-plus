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

# Copy all files over, overwriting existing ones
cp -r ./* "$TARGET_DIR/"

echo "Update applied successfully!"
