#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
VERSION_FILE=${UNYCLOUD_VERSION_FILE:-"$ROOT_DIR/UNYCLOUD_VERSION"}

current_version() {
  if [ -f "$VERSION_FILE" ]; then
    sed -n '1{s/^v//;p;}' "$VERSION_FILE"
    return 0
  fi

  git -C "$ROOT_DIR" describe --tags --abbrev=0 --match='v*' 2>/dev/null | sed 's/^v//' || printf '0.0.1\n'
}

bump_version() {
  kind=$1
  version=$(current_version)
  IFS=.
  set -- $version
  IFS=' '
  major=${1:-0}
  minor=${2:-0}
  patch=${3:-0}

  case "$kind" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    fix|patch) patch=$((patch + 1)) ;;
    none|current) ;;
    *) echo "usage: $0 [current|apply <version>|bump <major|minor|fix>]" >&2; exit 1 ;;
  esac

  printf '%s.%s.%s\n' "$major" "$minor" "$patch"
}

case "${1:-current}" in
  current)
    current_version
    ;;
  apply)
    version=${2:-}
    [ -n "$version" ] || { echo "usage: $0 apply <version>" >&2; exit 1; }
    printf '%s\n' "${version#v}" > "$VERSION_FILE"
    ;;
  bump)
    new_version=$(bump_version "${2:-fix}")
    printf '%s\n' "$new_version" > "$VERSION_FILE"
    printf '%s\n' "$new_version"
    ;;
  *)
    echo "usage: $0 [current|apply <version>|bump <major|minor|fix>]" >&2
    exit 1
    ;;
esac
