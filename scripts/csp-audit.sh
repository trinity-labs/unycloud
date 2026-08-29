#!/bin/sh

set -eu

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
failed=0
tmp="${TMPDIR:-/tmp}/unycloud-csp-audit.$$"

check_absent() {
	pattern="$1"
	shift
	if grep -R "$pattern" "$@" >"$tmp" 2>/dev/null; then
		cat "$tmp" >&2
		failed=1
	fi
}

check_absent "unsafe-" \
	"$repo_root/http" \
	"$repo_root/frontend/src" \
	"$repo_root/frontend/public" \
	"$repo_root/examples"

check_absent "sha256-" \
	"$repo_root/http" \
	"$repo_root/frontend/src" \
	"$repo_root/frontend/public" \
	"$repo_root/examples"

check_absent "cdn\\.jsdelivr" \
	"$repo_root/http" \
	"$repo_root/frontend/src" \
	"$repo_root/frontend/public" \
	"$repo_root/examples"

check_absent "@import url(['\"]https\\?://" \
	"$repo_root/frontend/src" \
	"$repo_root/frontend/public"

check_absent "style=" \
	"$repo_root/frontend/src" \
	"$repo_root/frontend/public"

check_absent ":style" \
	"$repo_root/frontend/src"

check_absent "v-bind:style" \
	"$repo_root/frontend/src"

check_absent "v-show" \
	"$repo_root/frontend/src"

check_absent "innerHTML" \
	"$repo_root/frontend/src"

check_absent "createElement(['\"]style" \
	"$repo_root/frontend/src" \
	"$repo_root/frontend/public"

check_absent "<script>[[:space:]]*$" \
	"$repo_root/frontend/index.html" \
	"$repo_root/frontend/public/index.html"

check_absent "<style>[[:space:]]*$" \
	"$repo_root/frontend/index.html" \
	"$repo_root/frontend/public/index.html"

if [ "${UNYCLOUD_NGINX_CONFIG:-}" ]; then
	check_absent "unsafe-" "$UNYCLOUD_NGINX_CONFIG"
	check_absent "sha256-" "$UNYCLOUD_NGINX_CONFIG"
fi

rm -f "$tmp"

if [ "$failed" -ne 0 ]; then
	echo "UnyCloud CSP audit failed" >&2
	exit 1
fi

echo "UnyCloud CSP audit passed"
