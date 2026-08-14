#!/usr/bin/env bash
set -euo pipefail

repository="${1:-RPSouto/seerr-plus}"
description='Seerr Plus Edition acrescenta pedidos colaborativos, utilizadores interessados, notificações partilhadas e gestão de remoções ao Seerr, com identidade visual preta e integração Plex/Radarr/Sonarr.'

if ! command -v gh >/dev/null 2>&1; then
  echo 'GitHub CLI (gh) is required. Install it and run: gh auth login' >&2
  exit 1
fi

gh repo edit "$repository" \
  --description "$description" \
  --add-topic seerr \
  --add-topic seerr-plus \
  --add-topic plex \
  --add-topic radarr \
  --add-topic sonarr \
  --add-topic media-requests \
  --add-topic docker \
  --add-topic self-hosted \
  --add-topic typescript

echo "GitHub About configured for $repository"
