#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
LOCK_DIR=${UNYCLOUD_DEPENDENCY_LOCK_DIR:-/tmp/unycloud-dependency-update.lock}
MANAGED_FILES="go.mod go.sum frontend/package.json frontend/pnpm-lock.yaml"

log() {
	printf '[unycloud-dependencies] %s\n' "$*"
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
	log "verification deja active"
	exit 0
fi

worktree=$(mktemp -d /var/tmp/unycloud-dependencies.XXXXXX)
cleanup() {
	git -C "$ROOT_DIR" worktree remove --force "$worktree" >/dev/null 2>&1 || true
	rm -rf "$worktree" "$LOCK_DIR"
}
trap cleanup EXIT INT TERM

for file in $MANAGED_FILES; do
	if ! git -C "$ROOT_DIR" diff --quiet -- "$file"; then
		log "mise a jour differee: $file contient des modifications locales"
		exit 0
	fi
done

base=$(git -C "$ROOT_DIR" rev-parse HEAD)
git -C "$ROOT_DIR" worktree add --quiet --detach "$worktree" "$base"

(
	cd "$worktree"
	export GOTOOLCHAIN="${GOTOOLCHAIN:-go1.27.4}"
	go get -u=patch ./...
	go mod tidy
	cd frontend
	CI=true pnpm update --lockfile-only
)

changed=0
for file in $MANAGED_FILES; do
	if ! cmp -s "$ROOT_DIR/$file" "$worktree/$file"; then
		changed=1
	fi
done

if [ "$changed" = 0 ]; then
	log "Go et extensions frontend deja a jour"
	exit 0
fi

log "mises a jour compatibles detectees, validation complete en espace isole"
(
	cd "$worktree"
	scripts/csp-audit.sh
	scripts/build.sh
	govulncheck ./...
	cd frontend
	pnpm audit --prod --audit-level high
)

[ "$(git -C "$ROOT_DIR" rev-parse HEAD)" = "$base" ] || {
	log "mise a jour differee: la revision source a change pendant la validation"
	exit 0
}
for file in $MANAGED_FILES; do
	git -C "$ROOT_DIR" diff --quiet -- "$file" || {
		log "mise a jour differee: $file a change pendant la validation"
		exit 0
	}
done

for file in $MANAGED_FILES; do
	if ! cmp -s "$ROOT_DIR/$file" "$worktree/$file"; then
		cp "$worktree/$file" "$ROOT_DIR/$file"
	fi
done

log "mises a jour validees appliquees; le watcher va reconstruire et deployer UnyCloud"
