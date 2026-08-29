#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${UNYCLOUD_GIT_SYNC_ENV:-"$ROOT_DIR/unycloud-git-sync.env"}
VERSION_SCRIPT=${VERSION_SCRIPT:-"$ROOT_DIR/scripts/unycloud-version.sh"}

UNYCLOUD_GIT_SYNC_ENABLED=${UNYCLOUD_GIT_SYNC_ENABLED:-0}
UNYCLOUD_GIT_SYNC_PUSH=${UNYCLOUD_GIT_SYNC_PUSH:-1}
UNYCLOUD_GIT_BRANCH=${UNYCLOUD_GIT_BRANCH:-master}
UNYCLOUD_GIT_RELEASE_VERSION=${UNYCLOUD_GIT_RELEASE_VERSION:-}
UNYCLOUD_GIT_RELEASE_PUSH_TAGS=${UNYCLOUD_GIT_RELEASE_PUSH_TAGS:-1}
UNYCLOUD_GIT_RELEASE_KIND=${UNYCLOUD_GIT_RELEASE_KIND:-auto}
UNYCLOUD_GIT_AUTO_BUMP=${UNYCLOUD_GIT_AUTO_BUMP:-1}
UNYCLOUD_GIT_COMMIT_FILE_LIMIT=${UNYCLOUD_GIT_COMMIT_FILE_LIMIT:-80}
UNYCLOUD_GIT_REQUIRE_BUILD=${UNYCLOUD_GIT_REQUIRE_BUILD:-1}
UNYCLOUD_GIT_BUILD_VERIFIED=${UNYCLOUD_GIT_BUILD_VERIFIED:-0}
GH_TOKEN_FILE=${GH_TOKEN_FILE:-${GITHUB_TOKEN_FILE:-/home/coder/TRINITY-DOCKER/root/.config/gh/token}}
GIT_TERMINAL_PROMPT=0
GIT_ASKPASS=/bin/false
export GIT_TERMINAL_PROMPT GIT_ASKPASS

log() {
  printf '[unycloud-git] %s\n' "$*"
}

load_env() {
  if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
  fi
}

timestamp_utc() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

remote_url() {
  git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || printf '%s\n' 'https://github.com/trinity-labs/unycloud.git'
}

auth_header() {
  [ -f "$GH_TOKEN_FILE" ] || return 0
  token=$(tr -d '\r\n' < "$GH_TOKEN_FILE")
  [ -n "$token" ] || return 0
  printf '%s' "x-access-token:$token" | base64 | tr -d '\n'
  printf '\n'
}

git_auth() {
  header=$(auth_header || true)
  if [ -n "$header" ]; then
    git -C "$ROOT_DIR" -c credential.helper= -c core.askPass=/bin/false -c "http.extraHeader=Authorization: Basic $header" "$@"
  else
    git -C "$ROOT_DIR" -c credential.helper= -c core.askPass=/bin/false "$@"
  fi
}

release_kind_rank() {
  case "$1" in
    fix) printf '1\n' ;;
    minor) printf '2\n' ;;
    major) printf '3\n' ;;
    *) printf '0\n' ;;
  esac
}

max_kind() {
  if [ "$(release_kind_rank "$2")" -gt "$(release_kind_rank "$1")" ]; then
    printf '%s\n' "$2"
  else
    printf '%s\n' "$1"
  fi
}

detect_release_kind() {
  case "$UNYCLOUD_GIT_RELEASE_KIND" in
    fix|minor|major) printf '%s\n' "$UNYCLOUD_GIT_RELEASE_KIND"; return 0 ;;
    auto|'') ;;
    *) log "release kind invalide: $UNYCLOUD_GIT_RELEASE_KIND"; return 1 ;;
  esac

  kind=fix
  changes=$(git -C "$ROOT_DIR" diff --cached --name-status)
  [ -n "$changes" ] || { printf 'fix\n'; return 0; }

  OLDIFS=$IFS
  IFS='
'
  for line in $changes; do
    IFS='	'
    set -- $line
    IFS=$OLDIFS
    status=$1
    path=${2:-}
    case "$status" in R*|C*) path=${3:-$path} ;; esac

    case "$path" in
      go.mod|go.sum|frontend/pnpm-lock.yaml|frontend/package.json|cmd/*|http/*|auth/*|users/*|storage/*)
        kind=$(max_kind "$kind" minor)
        ;;
      docs/*|README.md|RELEASE_NOTES.md|branding/*|frontend/public/img/*)
        kind=$(max_kind "$kind" fix)
        ;;
      .github/workflows/*|Dockerfile|scripts/security-scan.sh|scripts/build.sh)
        kind=$(max_kind "$kind" minor)
        ;;
    esac
  done
  IFS=$OLDIFS

  printf '%s\n' "$kind"
}

commit_summary() {
  git -C "$ROOT_DIR" diff --cached --name-status | awk '
    /^A/ { a++ } /^M/ { m++ } /^D/ { d++ } /^R/ { r++ }
    END { printf "%sA %sM %sD %sR", a+0, m+0, d+0, r+0 }'
}

commit_body() {
  limit=$UNYCLOUD_GIT_COMMIT_FILE_LIMIT
  count=$(git -C "$ROOT_DIR" diff --cached --name-status | wc -l | tr -d '[:space:]')
  printf 'Automated UnyCloud git sync.\n\n'
  printf 'Path: %s\n' "$ROOT_DIR"
  printf 'Timestamp UTC: %s\n' "$(timestamp_utc)"
  printf 'Changed file(s): %s\n' "$count"
  printf 'Summary: %s\n\n' "$(commit_summary)"
  printf 'Stat:\n'
  git -C "$ROOT_DIR" diff --cached --stat || true
  printf '\nFiles (first %s):\n' "$limit"
  git -C "$ROOT_DIR" diff --cached --name-status | sed 's/	/ /g' | sed -n "1,${limit}p"
}

release_version() {
  if [ -n "$UNYCLOUD_GIT_RELEASE_VERSION" ]; then
    printf '%s\n' "${UNYCLOUD_GIT_RELEASE_VERSION#v}"
  else
    "$VERSION_SCRIPT" current
  fi
}

commit_and_push() {
  git -C "$ROOT_DIR" add -A
  if git -C "$ROOT_DIR" diff --cached --quiet; then
    log "aucune modification a commit"
  else
    kind=$(detect_release_kind)
    if [ -z "$UNYCLOUD_GIT_RELEASE_VERSION" ] && [ "$UNYCLOUD_GIT_AUTO_BUMP" = "1" ]; then
      "$VERSION_SCRIPT" bump "$kind" >/dev/null
      git -C "$ROOT_DIR" add -A
    fi
    version=$(release_version)
    subject="unycloud: ${kind} v${version} $(timestamp_utc)"
    git -C "$ROOT_DIR" commit -m "$subject" -m "$(commit_body)"
  fi

  if [ "$UNYCLOUD_GIT_SYNC_PUSH" = "1" ]; then
    git_auth push origin "$UNYCLOUD_GIT_BRANCH"
  fi
}

create_release_tag() {
  version=$(release_version)
  tag="v$version"
  head=$(git -C "$ROOT_DIR" rev-parse HEAD)
  if git -C "$ROOT_DIR" rev-parse -q --verify "refs/tags/$tag" >/dev/null 2>&1; then
    target=$(git -C "$ROOT_DIR" rev-list -n 1 "$tag")
    [ "$target" = "$head" ] || { log "tag $tag existe deja sur un autre commit"; return 1; }
    log "tag $tag deja present"
  else
    git -C "$ROOT_DIR" tag -a "$tag" -m "unycloud: release $tag"
    log "tag $tag cree"
  fi

  if [ "$UNYCLOUD_GIT_SYNC_PUSH" = "1" ] && [ "$UNYCLOUD_GIT_RELEASE_PUSH_TAGS" = "1" ]; then
    git_auth push origin "refs/tags/$tag"
  fi
}

run_sync() {
  load_env
  [ "$UNYCLOUD_GIT_SYNC_ENABLED" = "1" ] || { log "sync git desactive"; return 0; }
  if [ "$UNYCLOUD_GIT_REQUIRE_BUILD" = "1" ] && [ "$UNYCLOUD_GIT_BUILD_VERIFIED" != "1" ]; then
    log "build non verifiee: commit/push refuse"
    log "utilise ./watch-unycloud.sh once ou exporte UNYCLOUD_GIT_BUILD_VERIFIED=1 apres une build OK"
    return 1
  fi
  git_auth fetch origin --prune >/dev/null 2>&1 || true
  commit_and_push
}

case "${1:-sync}" in
  sync|all)
    run_sync
    ;;
  release)
    load_env
    version=${2:-}
    [ -n "$version" ] || { echo "usage: $0 release <version>" >&2; exit 1; }
    UNYCLOUD_GIT_RELEASE_VERSION=${version#v}
    export UNYCLOUD_GIT_RELEASE_VERSION
    "$VERSION_SCRIPT" apply "$UNYCLOUD_GIT_RELEASE_VERSION"
    UNYCLOUD_GIT_SYNC_ENABLED=1
    export UNYCLOUD_GIT_SYNC_ENABLED
    run_sync
    create_release_tag
    ;;
  status)
    load_env
    printf 'enabled: %s\nbranch: %s\nversion: %s\nremote: %s\n' "$UNYCLOUD_GIT_SYNC_ENABLED" "$UNYCLOUD_GIT_BRANCH" "$("$VERSION_SCRIPT" current)" "$(remote_url)"
    ;;
  *)
    echo "usage: $0 [sync|release <version>|status]" >&2
    exit 1
    ;;
esac
