#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"

if [[ -z "$TARGET_DIR" || "$TARGET_DIR" == "-h" || "$TARGET_DIR" == "--help" ]]; then
  cat <<EOF
NOTA: O Seerr Plus é agora mantido como um FORK oficial completo no GitHub (RPSouto/seerr-plus).
Para compilar e atualizar diretamente no servidor, use:
    cd ~/Docker/Seerr-Plus
    git pull origin main
    ./scripts/fast-deploy.sh

Caso ainda deseje sincronizar ficheiros manualmente para uma pasta externa:
    $0 <diretoria_destino>
EOF
  exit 0
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Diretório de destino não encontrado: $TARGET_DIR" >&2
  exit 1
fi

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "A sincronizar ficheiros Seerr+ de $PACKAGE_DIR para $TARGET_DIR..."

if command -v rsync >/dev/null 2>&1; then
  rsync -av --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='config' \
    "$PACKAGE_DIR/" "$TARGET_DIR/"
else
  cp -a "$PACKAGE_DIR"/. "$TARGET_DIR"/
fi

# Remove stale moviefight file if present in target directory
rm -f "$TARGET_DIR/server/routes/moviefight.ts"

echo "Ficheiros sincronizados com sucesso para $TARGET_DIR!"
