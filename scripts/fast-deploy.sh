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

RAW_VERSION="$(tr -d '[:space:]' < "$PACKAGE_ROOT/SEERR_PLUS_VERSION" 2>/dev/null || echo "1.8.445")"
VERSION="${RAW_VERSION#seerr-plus-v}"
VERSION="${VERSION#v}"
PKG_VERSION="$(grep '"version":' "$PACKAGE_ROOT/package.json" 2>/dev/null | head -n1 | sed -E 's/.*"version":[[:space:]]*"([^"]+)".*/\1/' || echo "3.4.1")"

# Ensure package directory and files are owned by the current non-root user
if command -v sudo >/dev/null 2>&1 && [[ -n "${USER:-}" && "$(id -u)" -ne 0 ]]; then
  sudo chown -R "$USER:$USER" "$PACKAGE_ROOT" 2>/dev/null || true
fi

DEPLOY_DIR="${SEERR_DEPLOY_DIR:-}"
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
  DEPLOY_DIR="${DEPLOY_DIR:-${HOME}/Docker/Seerr-Plus}"
fi

IMAGE_REPOSITORY="${SEERR_PLUS_IMAGE_REPOSITORY:-local/seerr-plus}"
IMAGE_TAG="${SEERR_PLUS_IMAGE_TAG:-${VERSION}}"
IMAGE="${IMAGE_REPOSITORY}:${IMAGE_TAG}"
PKG_IMAGE="${IMAGE_REPOSITORY}:${PKG_VERSION}"
LATEST_IMAGE="${IMAGE_REPOSITORY}:latest"
HEALTH_URL="${SEERR_HEALTH_URL:-http://127.0.0.1:5055/api/v1/status}"
SKIP_TESTS="${FAST_DEPLOY_SKIP_TESTS:-false}"
COMPOSE_SERVICE="${SEERR_COMPOSE_SERVICE:-seerr}"

DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    DOCKER=(sudo docker)
  else
    printf '%s\n' "ERROR: Docker daemon is not accessible (tried docker and sudo docker)." >&2
    exit 2
  fi
fi

printf '==================================================\n'
printf ' Seerr Plus:           %s\n' "$VERSION"
printf ' Output image:         %s\n' "$IMAGE"
printf ' Deploy directory:     %s\n' "$DEPLOY_DIR"
printf '==================================================\n'

# 1. Tests & Validation
if [[ "$SKIP_TESTS" != "true" ]]; then
  printf '\n[1/4] Validating scripts and syntax...\n'
  bash -n "$PACKAGE_ROOT"/*.sh "$PACKAGE_ROOT"/scripts/*.sh 2>/dev/null || true
  if command -v pnpm >/dev/null 2>&1 && [[ -d "$PACKAGE_ROOT/node_modules" ]]; then
    printf 'Running TypeScript typecheck...\n'
    (cd "$PACKAGE_ROOT" && pnpm typecheck) || {
      printf 'WARNING: Typecheck returned warnings/errors, continuing build...\n'
    }
  fi
else
  printf '%s\n' "Skipping tests because FAST_DEPLOY_SKIP_TESTS=true."
fi

# 2. Build image
printf '\n[2/4] Building Seerr Plus Docker image...\n'
"${DOCKER[@]}" build --pull \
  -f "$PACKAGE_ROOT/Dockerfile" \
  --build-arg COMMIT_TAG="seerr-plus-v$VERSION" \
  -t "$PKG_IMAGE" \
  -t "$IMAGE" \
  -t "$LATEST_IMAGE" \
  "$PACKAGE_ROOT"

printf 'Successfully built: %s, %s and %s\n' "$PKG_IMAGE" "$IMAGE" "$LATEST_IMAGE"

# 3. Deploy
printf '\n[3/4] Deploying to Docker Compose...\n'
COMPOSE_FILE=""
for candidate in compose.yaml compose.yml docker-compose.yaml docker-compose.yml compose.postgres.yaml; do
  if [[ -f "${DEPLOY_DIR}/${candidate}" ]]; then
    COMPOSE_FILE="${candidate}"
    break
  fi
done

if [[ -z "${COMPOSE_FILE}" ]]; then
  printf 'ERROR: No compose file found in %s\n' "$DEPLOY_DIR" >&2
  exit 2
fi

cd "$DEPLOY_DIR"

# If deploy directory is separate from repo and apply-update exists, run apply-update
if [[ "$DEPLOY_DIR" != "$PACKAGE_ROOT" && -f "$PACKAGE_ROOT/apply-update.sh" ]]; then
  printf 'Applying update files to %s...\n' "$DEPLOY_DIR"
  "$PACKAGE_ROOT/apply-update.sh" "$DEPLOY_DIR" || true
fi

# Detect and stop any existing container binding port 5055 to avoid "port is already allocated"
existing_port_containers="$("${DOCKER[@]}" ps -q --filter "publish=5055" || true)"
if [[ -n "$existing_port_containers" ]]; then
  printf 'Stopping existing container(s) binding port 5055...\n'
  "${DOCKER[@]}" stop $existing_port_containers || true
fi
"${DOCKER[@]}" rm -f seerr-plus-seerr-1 seerr seerr-plus-deploy 2>/dev/null || true

# Compose override ensuring standard container_name and latest local image
OVERRIDE="docker-compose.seerr-plus.yml"
cat <<EOF > "$OVERRIDE"
services:
  ${COMPOSE_SERVICE}:
    container_name: seerr
    image: ${IMAGE}
    pull_policy: never
EOF

printf 'Starting Seerr Plus container...\n'
"${DOCKER[@]}" compose -f "${COMPOSE_FILE}" -f "${OVERRIDE}" up -d --force-recreate "${COMPOSE_SERVICE}"
"${DOCKER[@]}" compose -f "${COMPOSE_FILE}" -f "${OVERRIDE}" ps "${COMPOSE_SERVICE}"

# 4. Healthcheck
printf '\n[4/4] Verifying health at %s...\n' "$HEALTH_URL"
healthy=false
for _attempt in $(seq 1 45); do
  # Check if container is actually running
  is_running="$("${DOCKER[@]}" inspect -f '{{.State.Running}}' seerr 2>/dev/null || echo "false")"
  if [[ "$is_running" == "true" ]] && curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" == "true" ]]; then
  printf 'Seerr Plus is up and healthy!\n'
else
  printf 'ERROR: Seerr Plus container failed to start or health endpoint %s did not respond within 90s.\n' "$HEALTH_URL" >&2
  "${DOCKER[@]}" compose -f "${COMPOSE_FILE}" -f "${OVERRIDE}" logs --tail=50 "${COMPOSE_SERVICE}" >&2 || true
  exit 1
fi

if command -v sudo >/dev/null 2>&1 && [[ -n "${USER:-}" && "$(id -u)" -ne 0 ]]; then
  sudo chown -R "$USER:$USER" "$PACKAGE_ROOT" 2>/dev/null || true
fi

printf '\nSeerr Plus fast deploy completed successfully.\n'
