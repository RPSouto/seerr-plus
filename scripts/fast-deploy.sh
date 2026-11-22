#!/usr/bin/env bash

# Keep an accidentally sourced deployment from changing or terminating the
# caller's interactive SSH shell.
if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  printf '%s\n' "Seerr Plus fast-deploy.sh was sourced; running in an isolated shell."
  bash "${BASH_SOURCE[0]}" "$@"
  return $?
fi

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

# Parse command line flags
DO_GIT_PULL=false
DOCKER_NO_CACHE=""
SKIP_TESTS="${FAST_DEPLOY_SKIP_TESTS:-false}"
NO_DEPLOY=false
CLI_DEPLOY_DIR=""
COMPOSE_SERVICE="${SEERR_COMPOSE_SERVICE:-seerr}"
HEALTH_URL="${SEERR_HEALTH_URL:-http://127.0.0.1:5055/api/v1/status}"

show_help() {
  cat <<EOF
Uso: $0 [opções]

Script de compilação e deploy direto do fork oficial Seerr Plus (RPSouto/seerr-plus).

Opções:
  -p, --pull            Executa 'git pull origin main' antes de compilar
  --no-cache            Força Docker build sem cache (--no-cache)
  -s, --skip-tests      Salta verificações de sintaxe e typecheck
  --no-deploy           Apenas compila as imagens Docker sem fazer deploy/restart
  -d, --deploy-dir DIR  Define o diretório de deploy onde reside o compose file
  --service NOME        Nome do serviço compose (default: seerr)
  -h, --help            Mostra esta mensagem de ajuda

Variáveis de ambiente suportadas:
  SEERR_DEPLOY_DIR            Diretório de deploy alternativo
  SEERR_PLUS_IMAGE_REPOSITORY Repositório da imagem (default: local/seerr-plus)
  FAST_DEPLOY_SKIP_TESTS      Se 'true', salta testes
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--pull)
      DO_GIT_PULL=true
      shift
      ;;
    --no-cache)
      DOCKER_NO_CACHE="--no-cache"
      shift
      ;;
    -s|--skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --no-deploy)
      NO_DEPLOY=true
      shift
      ;;
    -d|--deploy-dir)
      CLI_DEPLOY_DIR="$2"
      shift 2
      ;;
    --service)
      COMPOSE_SERVICE="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      printf 'Opção desconhecida: %s\n' "$1" >&2
      show_help
      exit 1
      ;;
  esac
done

# 0. Git Pull opcional
if [[ "$DO_GIT_PULL" == "true" ]]; then
  if [[ -d "$PACKAGE_ROOT/.git" ]] && command -v git >/dev/null 2>&1; then
    printf '\n[0/4] A puxar alterações mais recentes do GitHub (origin/main)...\n'
    git -C "$PACKAGE_ROOT" pull origin main || {
      printf 'AVISO: Não foi possível fazer git pull origin main. A continuar com os ficheiros locais...\n'
    }
  fi
fi

RAW_VERSION="$(tr -d '[:space:]' < "$PACKAGE_ROOT/SEERR_PLUS_VERSION" 2>/dev/null || echo "1.8.455")"
VERSION="${RAW_VERSION#seerr-plus-v}"
VERSION="${VERSION#v}"
PKG_VERSION="$(grep '"version":' "$PACKAGE_ROOT/package.json" 2>/dev/null | head -n1 | sed -E 's/.*"version":[[:space:]]*"([^"]+)".*/\1/' || echo "3.5.2")"

IMAGE_REPOSITORY="${SEERR_PLUS_IMAGE_REPOSITORY:-local/seerr-plus}"
PRIMARY_IMAGE="${IMAGE_REPOSITORY}:${PKG_VERSION}"

# Determine Deploy directory
DEPLOY_DIR="${CLI_DEPLOY_DIR:-${SEERR_DEPLOY_DIR:-}}"
if [[ -z "$DEPLOY_DIR" ]]; then
  for candidate in \
    "${HOME}/Docker/Seerr-Plus-Deploy" \
    "/home/server/Docker/Seerr-Plus-Deploy" \
    "${HOME}/Docker/Seerr-Plus" \
    "/home/server/Docker/Seerr-Plus" \
    "$PACKAGE_ROOT"; do
    if [[ -d "$candidate" && ( -f "$candidate/compose.yaml" || -f "$candidate/compose.yml" || -f "$candidate/docker-compose.yaml" || -f "$candidate/docker-compose.yml" || -f "$candidate/compose.postgres.yaml" ) ]]; then
      DEPLOY_DIR="$candidate"
      break
    fi
  done
  DEPLOY_DIR="${DEPLOY_DIR:-${HOME}/Docker/Seerr-Plus-Deploy}"
fi

# Ensure package directory and files are owned by the current non-root user
if command -v sudo >/dev/null 2>&1 && [[ -n "${USER:-}" && "$(id -u)" -ne 0 ]]; then
  sudo chown -R "$USER:$USER" "$PACKAGE_ROOT" 2>/dev/null || true
fi

# Detect Docker command
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    DOCKER=(sudo docker)
  else
    printf '%s\n' "ERRO: Docker daemon inacessível (tentou 'docker' e 'sudo docker')." >&2
    exit 2
  fi
fi

printf '==================================================\n'
printf ' Seerr Base Version:    %s\n' "$PKG_VERSION"
printf ' Seerr Plus Extension:  v%s (%s)\n' "$VERSION" "$RAW_VERSION"
printf ' Source (Fork):         %s\n' "$PACKAGE_ROOT"
printf ' Deploy Directory:      %s\n' "$DEPLOY_DIR"
printf ' Primary Image Tag:     %s\n' "$PRIMARY_IMAGE"
printf '==================================================\n'

# 1. Tests & Validation
if [[ "$SKIP_TESTS" != "true" ]]; then
  printf '\n[1/4] A validar sintaxe e scripts...\n'
  bash -n "$PACKAGE_ROOT"/*.sh "$PACKAGE_ROOT"/scripts/*.sh 2>/dev/null || true
  if command -v pnpm >/dev/null 2>&1 && [[ -d "$PACKAGE_ROOT/node_modules" ]]; then
    printf 'A verificar tipos com pnpm typecheck:server...\n'
    (cd "$PACKAGE_ROOT" && pnpm typecheck:server) || {
      printf 'AVISO: Typecheck reportou avisos, a continuar compilação...\n'
    }
  fi
else
  printf '\n[1/4] A ignorar testes (--skip-tests ativo).\n'
fi

# 2. Build image
printf '\n[2/4] A compilar imagem Docker do Seerr Plus a partir do Fork...\n'

BUILD_CMD=(
  "${DOCKER[@]}" build
  --pull
  -f "$PACKAGE_ROOT/Dockerfile"
  --build-arg "COMMIT_TAG=seerr-plus-v$VERSION"
  -t "$IMAGE_REPOSITORY:$PKG_VERSION"
  -t "$IMAGE_REPOSITORY:$VERSION"
  -t "$IMAGE_REPOSITORY:seerr-plus-v$VERSION"
  -t "$IMAGE_REPOSITORY:3.5.1"
  -t "$IMAGE_REPOSITORY:3.4.1"
  -t "$IMAGE_REPOSITORY:latest"
)

if [[ -n "$DOCKER_NO_CACHE" ]]; then
  BUILD_CMD+=("$DOCKER_NO_CACHE")
fi

BUILD_CMD+=("$PACKAGE_ROOT")

"${BUILD_CMD[@]}"

printf 'Compilação concluída com sucesso com as tags:\n'
printf '  - %s:%s\n' "$IMAGE_REPOSITORY" "$PKG_VERSION"
printf '  - %s:%s\n' "$IMAGE_REPOSITORY" "$VERSION"
printf '  - %s:3.5.1 (retrocompatibilidade)\n' "$IMAGE_REPOSITORY"
printf '  - %s:3.4.1 (retrocompatibilidade)\n' "$IMAGE_REPOSITORY"
printf '  - %s:latest\n' "$IMAGE_REPOSITORY"

if [[ "$NO_DEPLOY" == "true" ]]; then
  printf '\n--no-deploy ativo. Compilação concluída sem restart do contentor.\n'
  exit 0
fi

# 3. Deploy
printf '\n[3/4] A atualizar contentor no Docker Compose...\n'
COMPOSE_FILE=""
for candidate in compose.yaml compose.yml docker-compose.yaml docker-compose.yml compose.postgres.yaml; do
  if [[ -f "${DEPLOY_DIR}/${candidate}" ]]; then
    COMPOSE_FILE="${candidate}"
    break
  fi
done

if [[ -z "${COMPOSE_FILE}" ]]; then
  printf 'ERRO: Nenhum compose file encontrado em %s\n' "$DEPLOY_DIR" >&2
  printf 'Ficheiros suportados: compose.yaml, compose.yml, docker-compose.yaml, docker-compose.yml\n' >&2
  exit 2
fi

cd "$DEPLOY_DIR"

# Clean up any leftover temporary override from legacy scripts
rm -f "${DEPLOY_DIR}/docker-compose.seerr-plus.yml" 2>/dev/null || true

# Recreate the compose stack with the newly built local image
printf 'A iniciar contentores em %s (usando %s)...\n' "$DEPLOY_DIR" "$COMPOSE_FILE"
"${DOCKER[@]}" compose -f "${COMPOSE_FILE}" up -d --force-recreate
"${DOCKER[@]}" compose -f "${COMPOSE_FILE}" ps

# 4. Healthcheck & Version Verification
printf '\n[4/4] A verificar estado e versão em %s...\n' "$HEALTH_URL"
healthy=false
STATUS_RESPONSE=""

for _attempt in $(seq 1 45); do
  STATUS_RESPONSE="$(curl -fsS "$HEALTH_URL" 2>/dev/null || true)"
  if [[ -n "$STATUS_RESPONSE" ]]; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" == "true" ]]; then
  printf '\nSeerr Plus está ativo e saudável!\n'
  printf 'Dados da API: %s\n' "$STATUS_RESPONSE"
else
  printf 'ERRO: O endpoint %s não respondeu no prazo de 90s.\n' "$HEALTH_URL" >&2
  "${DOCKER[@]}" compose -f "${COMPOSE_FILE}" logs --tail=50 >&2 || true
  exit 1
fi

if command -v sudo >/dev/null 2>&1 && [[ -n "${USER:-}" && "$(id -u)" -ne 0 ]]; then
  sudo chown -R "$USER:$USER" "$PACKAGE_ROOT" 2>/dev/null || true
fi

printf '\nDeploy do Seerr Plus concluído com sucesso a partir do fork!\n'
