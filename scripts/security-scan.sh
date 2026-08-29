#!/bin/sh

set -eu

export GOTOOLCHAIN="${GOTOOLCHAIN:-go1.26.6}"

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

cd "$repo_root"
"$repo_root/scripts/csp-audit.sh"
go test ./...

if command -v govulncheck >/dev/null 2>&1; then
	govulncheck ./...
elif [ -x "$(go env GOPATH)/bin/govulncheck" ]; then
	"$(go env GOPATH)/bin/govulncheck" ./...
else
	echo "govulncheck not found; install with:" >&2
	echo "go install golang.org/x/vuln/cmd/govulncheck@latest" >&2
	exit 1
fi

cd "$repo_root/frontend"
pnpm audit --prod
