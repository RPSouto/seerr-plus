#!/usr/bin/env bash
set -euo pipefail

expected_repo='RPSouto/seerr-plus'
remote_name="${SEERR_PLUS_REMOTE_NAME:-private}"
remote_url="${SEERR_PLUS_REMOTE_URL:-git@github.com:RPSouto/seerr-plus.git}"

release="${1:-}"
if [[ -z "$release" ]]; then
  read -r -p 'Branch/release (example: seerr-plus-v1.8.5): ' release
fi

if [[ ! "$release" =~ ^seerr-plus-v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo 'Invalid release. Use the full format seerr-plus-vMAJOR.MINOR.PATCH.' >&2
  exit 2
fi

version="${release#seerr-plus-v}"
patch_version="${version##*.}"
if (( 10#$patch_version % 5 != 0 )); then
  echo 'Invalid release patch. PATCH must be a multiple of 5 (for example 1.8.5, 1.8.10, or 1.9.0).' >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" || ! -f "$repo_root/package.json" ]]; then
  echo 'Run this script from inside the Seerr+ Git checkout.' >&2
  exit 1
fi
cd -- "$repo_root"

if [[ -z "$(git config user.name || true)" || -z "$(git config user.email || true)" ]]; then
  echo 'Configure Git identity once before publishing:' >&2
  echo '  git config user.name "Your Name"' >&2
  echo '  git config user.email "your@email.example"' >&2
  exit 1
fi

if git remote get-url "$remote_name" >/dev/null 2>&1; then
  configured_url="$(git remote get-url "$remote_name")"
  case "$configured_url" in
    "git@github.com:${expected_repo}.git"|"https://github.com/${expected_repo}.git"|"https://github.com/${expected_repo}") ;;
    *)
      echo "Remote '$remote_name' does not point to $expected_repo." >&2
      echo "Use SEERR_PLUS_REMOTE_NAME/SEERR_PLUS_REMOTE_URL or correct it explicitly." >&2
      exit 1
      ;;
  esac
else
  git remote add "$remote_name" "$remote_url"
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$release" ]]; then
  if git show-ref --verify --quiet "refs/heads/$release"; then
    git switch "$release"
  else
    git switch -c "$release"
  fi
fi

printf '%s\n' "$release" > SEERR_PLUS_VERSION
git add -A

if git diff --cached --quiet; then
  echo 'No file changes to commit; using the current HEAD.'
else
  git commit -m "release: $release"
fi

if git show-ref --verify --quiet "refs/tags/$release"; then
  tagged_commit="$(git rev-list -n 1 "$release")"
  if [[ "$tagged_commit" != "$(git rev-parse HEAD)" ]]; then
    echo "Tag '$release' already exists on another commit; refusing to move it." >&2
    exit 1
  fi
else
  git tag -a "$release" -m "Seerr+ $release"
fi

if [[ "${SEERR_PLUS_NO_PUSH:-false}" == 'true' ]]; then
  echo "Prepared $release locally; push skipped by SEERR_PLUS_NO_PUSH=true."
  exit 0
fi

git push -u "$remote_name" "refs/heads/$release:refs/heads/$release"
git push "$remote_name" "refs/tags/$release:refs/tags/$release"

echo "Published $release to $expected_repo."
