#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEPLOY_ROOT="${DEPLOY_ROOT:-/www/wwwroot/subo-deploy}"
APP_USER="${APP_USER:-www}"
APP_GROUP="${APP_GROUP:-www}"
NGINX_CONF_PATH="${NGINX_CONF_PATH:-/www/server/panel/vhost/nginx/subo-platform.conf}"

SYNC_NGINX="${DEPLOY_SYNC_NGINX:-0}"
SYNC_SYSTEMD="${DEPLOY_SYNC_SYSTEMD:-0}"
RESTART_SERVICES="${DEPLOY_RESTART_SERVICES:-1}"

log() {
  printf '[deploy-remote] %s\n' "$*"
}

require_file() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    printf 'Missing required file: %s\n' "$file_path" >&2
    exit 1
  fi
}

install_artifacts() {
  log "Installing build artifacts into ${DEPLOY_ROOT}"

  install -d "$DEPLOY_ROOT/admin" "$DEPLOY_ROOT/web" "$DEPLOY_ROOT/api/dist" "$DEPLOY_ROOT/shared"

  rm -rf "$DEPLOY_ROOT/admin"/*
  rm -rf "$DEPLOY_ROOT/web"/*
  rm -rf "$DEPLOY_ROOT/api/dist"/*

  tar xzf "$SCRIPT_DIR/admin-dist.tgz" -C "$DEPLOY_ROOT/admin"
  tar xzf "$SCRIPT_DIR/web-output.tgz" -C "$DEPLOY_ROOT/web"
  tar xzf "$SCRIPT_DIR/api-dist.tgz" -C "$DEPLOY_ROOT/api/dist"

  chown -R "$APP_USER:$APP_GROUP" \
    "$DEPLOY_ROOT/admin" \
    "$DEPLOY_ROOT/web" \
    "$DEPLOY_ROOT/api/dist" \
    "$DEPLOY_ROOT/shared"
}

sync_systemd_units() {
  log "Syncing systemd service files"

  require_file "$SCRIPT_DIR/deploy/systemd/subo-web.service"
  require_file "$SCRIPT_DIR/deploy/systemd/subo-api.service"

  if [[ ! -f "$DEPLOY_ROOT/shared/subo-api.env" ]]; then
    printf 'Expected %s/shared/subo-api.env before syncing systemd.\n' "$DEPLOY_ROOT" >&2
    printf 'You can seed it from deploy/env/subo-api.env.example and rerun.\n' >&2
    exit 1
  fi

  install -m 0644 "$SCRIPT_DIR/deploy/systemd/subo-web.service" /etc/systemd/system/subo-web.service
  install -m 0644 "$SCRIPT_DIR/deploy/systemd/subo-api.service" /etc/systemd/system/subo-api.service
  systemctl daemon-reload
  systemctl enable subo-web.service subo-api.service
}

sync_nginx_conf() {
  log "Syncing nginx config"
  require_file "$SCRIPT_DIR/deploy/nginx/subo-platform.conf"
  install -m 0644 "$SCRIPT_DIR/deploy/nginx/subo-platform.conf" "$NGINX_CONF_PATH"
  nginx -t
  nginx -s reload
}

restart_services() {
  log "Restarting app services"
  systemctl restart subo-api.service
  systemctl restart subo-web.service
}

run_health_checks() {
  log "Running local health checks"
  wait_for_url "http://127.0.0.1:3006/api/health"
  wait_for_url "http://127.0.0.1:3007"
}

wait_for_url() {
  local url="$1"
  local attempt

  for attempt in $(seq 1 20); do
    if curl -fsS -o /dev/null "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 1
  done

  printf 'Health check failed after retries: %s\n' "$url" >&2
  exit 1
}

main() {
  require_file "$SCRIPT_DIR/admin-dist.tgz"
  require_file "$SCRIPT_DIR/web-output.tgz"
  require_file "$SCRIPT_DIR/api-dist.tgz"

  install_artifacts

  if [[ "$SYNC_SYSTEMD" == "1" ]]; then
    sync_systemd_units
  fi

  if [[ "$RESTART_SERVICES" == "1" ]]; then
    restart_services
  fi

  run_health_checks

  if [[ "$SYNC_NGINX" == "1" ]]; then
    sync_nginx_conf
  fi

  log "Deployment finished"
}

main "$@"
