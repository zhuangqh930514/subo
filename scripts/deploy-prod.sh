#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_BASE_DIR="${DEPLOY_BASE_DIR:-/root/subo-release}"
DEPLOY_REMOTE_ROOT="${DEPLOY_REMOTE_ROOT:-/www/wwwroot/subo-deploy}"
DEPLOY_SYNC_NGINX="${DEPLOY_SYNC_NGINX:-0}"
DEPLOY_SYNC_SYSTEMD="${DEPLOY_SYNC_SYSTEMD:-0}"
DEPLOY_RESTART_SERVICES="${DEPLOY_RESTART_SERVICES:-1}"
DEPLOY_SKIP_BUILD="${DEPLOY_SKIP_BUILD:-0}"

if [[ -z "$DEPLOY_HOST" ]]; then
  printf 'Please set DEPLOY_HOST before running this script.\n' >&2
  exit 1
fi

release_id="$(date '+%Y%m%d-%H%M%S')"
stage_dir="$(mktemp -d "${TMPDIR:-/tmp}/subo-release-${release_id}-XXXX")"
bundle_dir="$stage_dir/bundle"
mkdir -p "$bundle_dir/deploy" "$bundle_dir/scripts"

cleanup() {
  rm -rf "$stage_dir"
}
trap cleanup EXIT

log() {
  printf '[deploy-local] %s\n' "$*"
}

create_tarball() {
  local output_path="$1"
  local source_dir="$2"
  local tar_args=()

  if tar --help 2>&1 | grep -q -- '--no-mac-metadata'; then
    tar_args+=(--no-mac-metadata)
  fi

  if tar --help 2>&1 | grep -q -- '--no-xattrs'; then
    tar_args+=(--no-xattrs)
  fi

  if (( ${#tar_args[@]} )); then
    COPYFILE_DISABLE=1 COPY_EXTENDED_ATTRIBUTES_DISABLE=1 \
      tar "${tar_args[@]}" -czf "$output_path" -C "$source_dir" .
  else
    COPYFILE_DISABLE=1 COPY_EXTENDED_ATTRIBUTES_DISABLE=1 \
      tar -czf "$output_path" -C "$source_dir" .
  fi
}

build_all() {
  log 'Building admin'
  pnpm --dir "$ROOT_DIR" --filter @subo/admin build

  log 'Building web'
  NUXT_IGNORE_LOCK=1 pnpm --dir "$ROOT_DIR" --filter @subo/web build

  log 'Building api'
  pnpm --dir "$ROOT_DIR" --filter @subo/api build
}

package_bundle() {
  log 'Packaging build artifacts'
  create_tarball "$bundle_dir/admin-dist.tgz" "$ROOT_DIR/apps/admin/dist"
  create_tarball "$bundle_dir/web-output.tgz" "$ROOT_DIR/apps/web/.output"
  create_tarball "$bundle_dir/api-dist.tgz" "$ROOT_DIR/apps/api/dist"

  cp -R "$ROOT_DIR/deploy/." "$bundle_dir/deploy/"
  cp "$ROOT_DIR/scripts/deploy-prod-remote.sh" "$bundle_dir/"
}

upload_bundle() {
  local remote_release_dir="${DEPLOY_BASE_DIR}/${release_id}"
  log "Uploading bundle to ${DEPLOY_USER}@${DEPLOY_HOST}:${remote_release_dir}"
  ssh -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p '$remote_release_dir'"
  scp -P "$DEPLOY_PORT" -r "$bundle_dir/." "$DEPLOY_USER@$DEPLOY_HOST:$remote_release_dir/"

  log 'Running remote deploy script'
  ssh -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" \
    "DEPLOY_ROOT='$DEPLOY_REMOTE_ROOT' DEPLOY_SYNC_NGINX='$DEPLOY_SYNC_NGINX' DEPLOY_SYNC_SYSTEMD='$DEPLOY_SYNC_SYSTEMD' DEPLOY_RESTART_SERVICES='$DEPLOY_RESTART_SERVICES' bash '$remote_release_dir/deploy-prod-remote.sh'"
}

main() {
  if [[ "$DEPLOY_SKIP_BUILD" != "1" ]]; then
    build_all
  else
    log 'Skipping build because DEPLOY_SKIP_BUILD=1'
  fi

  package_bundle
  upload_bundle
  log 'Done'
}

main "$@"
