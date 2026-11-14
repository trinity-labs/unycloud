#!/bin/sh

set -eu

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
install_root="${UNYCLOUD_INSTALL_ROOT:-}"
binary="${UNYCLOUD_BINARY:-$repo_root/dist/unycloud}"
target="${UNYCLOUD_INSTALL_TARGET:-/usr/local/bin/unycloud}"
backup="${UNYCLOUD_BACKUP_TARGET:-}"
database="${UNYCLOUD_DATABASE_PATH:-/var/lib/unycloud/database.db}"
database_backup="${UNYCLOUD_DATABASE_BACKUP_PATH:-/var/lib/unycloud/database.previous.db}"
verify_command="${UNYCLOUD_INSTALL_VERIFY_COMMAND:-}"

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
database_path="$install_root$database"
database_backup_path="$install_root$database_backup"
if [ -z "$backup" ]; then
	backup="$target_path.bak"
else
	backup="$install_root$backup"
fi

mkdir -p "$target_dir"

if [ -f "$target_path" ]; then
	cp -p "$target_path" "$backup"
	echo "backup: $backup"
fi

if [ -f "$database_path" ]; then
	mkdir -p "$(dirname -- "$database_backup_path")"
	cp -p "$database_path" "$database_backup_path"
	echo "database backup: $database_backup_path"
fi

install -m 755 "$binary" "$target_path"
"$target_path" version

if [ -n "$verify_command" ] && ! sh -c "$verify_command"; then
	echo "health verification failed; restoring previous UnyCloud binary" >&2
	[ -f "$backup" ] || { echo "rollback binary missing: $backup" >&2; exit 1; }
	cp -p "$backup" "$target_path"
	if ! sh -c "$verify_command"; then
		echo "rollback health verification failed" >&2
		exit 1
	fi
	echo "previous UnyCloud binary restored" >&2
	exit 1
fi
