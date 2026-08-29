#!/bin/sh

set -eu

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
install_root="${UNYCLOUD_INSTALL_ROOT:-}"
binary="${UNYCLOUD_BINARY:-$repo_root/dist/unycloud}"
target="${UNYCLOUD_INSTALL_TARGET:-/usr/local/bin/filebrowser}"
backup_suffix="${UNYCLOUD_BACKUP_SUFFIX:-$(date -u +%Y%m%dT%H%M%SZ)}"

if [ -z "$install_root" ]; then
	echo "UNYCLOUD_INSTALL_ROOT is required, for example: /mnt/server-root" >&2
	exit 1
fi

if [ ! -x "$binary" ]; then
	echo "missing executable: $binary" >&2
	echo "run scripts/build.sh first" >&2
	exit 1
fi

if [ ! -d "$install_root" ]; then
	echo "missing install root: $install_root" >&2
	exit 1
fi

target_path="$install_root$target"
target_dir="$(dirname -- "$target_path")"
backup="$target_path.$backup_suffix.bak"

mkdir -p "$target_dir"

if [ -f "$target_path" ]; then
	cp -p "$target_path" "$backup"
	echo "backup: $backup"
fi

install -m 755 "$binary" "$target_path"
"$target_path" version
