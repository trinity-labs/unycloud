#!/bin/sh

set -eu

BINARY=${UNYCLOUD_WATCH_BINARY:-/usr/local/bin/filebrowser}
SERVICE=${UNYCLOUD_RESTART_SERVICE:-filebrowser}
POLL_INTERVAL=${UNYCLOUD_RESTART_POLL_INTERVAL:-5}
QUIET_SECONDS=${UNYCLOUD_RESTART_QUIET_SECONDS:-2}
STAMP_FILE=${UNYCLOUD_RESTART_STAMP_FILE:-/run/unycloud-autorestart.stamp}

fingerprint() {
  if [ ! -f "$BINARY" ]; then
    printf 'missing\n'
    return 0
  fi

  stat -c '%Y:%s:%n' "$BINARY"
}

restart_service() {
  before=$(fingerprint)
  sleep "$QUIET_SECONDS"
  after=$(fingerprint)
  [ "$before" = "$after" ] || return 0

  rc-service "$SERVICE" restart
}

mkdir -p "$(dirname "$STAMP_FILE")"
fingerprint > "$STAMP_FILE"

while true; do
  old=$(cat "$STAMP_FILE" 2>/dev/null || printf '')
  new=$(fingerprint)
  if [ "$old" != "$new" ]; then
    printf '%s\n' "$new" > "$STAMP_FILE"
    restart_service || true
  fi
  sleep "$POLL_INTERVAL"
done
