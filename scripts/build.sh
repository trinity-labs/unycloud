#!/bin/sh

set -eu

export GOTOOLCHAIN="${GOTOOLCHAIN:-go1.26.6}"

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
dist_dir="${UNYCLOUD_DIST_DIR:-$repo_root/dist}"
version="${UNYCLOUD_VERSION:-$(git -C "$repo_root" describe --tags --abbrev=0 --match='v*' 2>/dev/null | sed 's/^v//')}"
commit="${UNYCLOUD_COMMIT:-$(git -C "$repo_root" log -n 1 --format=%h)}"

if [ -z "$version" ]; then
	version="0.0.1"
fi

mkdir -p "$dist_dir"

"$repo_root/scripts/csp-audit.sh"

cd "$repo_root/frontend"
CI=true pnpm install --frozen-lockfile
pnpm run build

cd "$repo_root"
go test ./...
CGO_ENABLED="${CGO_ENABLED:-0}" go build -trimpath -ldflags="-s -w -X github.com/filebrowser/filebrowser/v2/version.Version=$version -X github.com/filebrowser/filebrowser/v2/version.CommitSHA=$commit" -o "$dist_dir/unycloud" .

"$dist_dir/unycloud" version
