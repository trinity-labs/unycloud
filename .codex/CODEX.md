# CODEX.md

UnyCloud is a maintained, security-focused fork of File Browser.

## Project Contract

- Repository: `trinity-labs/unycloud`.
- Lineage: `filebrowser/filebrowser`, Apache-2.0.
- Keep the Go module path `github.com/filebrowser/filebrowser/v2` unless a
  deliberate module migration is planned.
- Preserve total File Browser compatibility by default: CLI, flags, config
  files, database format, HTTP API, `FB_*` environment variables, user/share
  models, and legacy executable path support.
- Security fixes may tighten risky behavior, but avoid config migrations and
  document any unavoidable behavior change.

## Security Rules

- CSP must never rely on `unsafe-inline`, `unsafe-eval`, hashes, or nonce
  workarounds.
- Application code must not contain inline `<script>`, inline `<style>`,
  `style=""`, Vue `:style`, `v-bind:style`, or `v-show`.
- Avoid dependencies that inject runtime scripts/styles. Replace them with local
  CSP-safe components or static CSS.
- No `innerHTML` except narrowly reviewed sanitized content. Markdown preview
  must use DOMPurify with `style` attributes and `style` tags forbidden.
- Keep dynamic CSS changes in the audited CSSOM helper only, with sanitized or
  clamped values.
- Treat all filenames, paths, archive entries, headers, share tokens, command
  text, and hook input as attacker-controlled.
- Do not trust forwarded client IP headers inside the app. Use the socket peer
  address unless a trusted-proxy model is explicitly implemented and tested.
- Keep command execution and hooks disabled by default; if touched, add tests
  for shell metacharacters, path scope, timeout behavior, and permission checks.
- Keep request bodies bounded on auth/admin/share mutation endpoints.
- Login hardening includes server-issued HttpOnly cookies, same-origin write
  checks, browser password-manager attributes, and stable security event logs.
- Keep `/api/security/status`, `/api/security/events`, and
  `/api/security/fail2ban` admin-only.
- Prefer deny-by-default behavior for new preview/embed surfaces.

## CVE And Dependency Hygiene

- Use the pinned Go toolchain from `go.mod` (`go1.26.6` at v0.0.1).
- Run `govulncheck` and production `pnpm audit` before release.
- Keep Dependabot config active for Go modules and frontend packages.
- When updating dependencies, verify that the replacement does not weaken CSP or
  introduce runtime style/script injection.
- Do not suppress vulnerability reports without code-path analysis.

## Required Local Checks

```sh
scripts/csp-audit.sh
scripts/build.sh
scripts/security-scan.sh
go vet ./...
go test -race ./http ./auth ./runner ./files ./fileutils ./users
cd frontend && pnpm run lint && pnpm run test
```

Optional private reverse proxy audit, with the private path kept outside Git:

```sh
UNYCLOUD_NGINX_CONFIG=/path/to/nginx.conf scripts/csp-audit.sh
```

Private branding rules: no CDN `@import`, no custom JS autofill shims, and no
deployment-specific files committed to the repository.

## Release Notes

- Keep private deployment domains, sshfs paths, tokens, keys, and local service
  files out of the project history.
- `dist/` remains ignored. Build artifacts are generated from the release tag.
- Version source of truth is `UNYCLOUD_VERSION`; `scripts/build.sh` reads it
  unless `UNYCLOUD_VERSION` is passed explicitly.
- Auto-sync mirrors the docs policy:
  `watch-unycloud.sh once|start|stop|status` builds, audits CSP, and calls
  `scripts/sync-unycloud-git.sh` when `UNYCLOUD_GIT_SYNC_ENABLED=1`.
- `scripts/sync-unycloud-git.sh` must refuse commit/push unless a build was
  verified (`UNYCLOUD_GIT_REQUIRE_BUILD=1`, default). Prefer the watcher path.
- Keep `unycloud-git-sync.env` local; commit only
  `unycloud-git-sync.env.example`.
- `v0.0.1` publishes binary archives; Docker/Compose examples build local images
  from `dist/unycloud`.
- Legacy installs can keep `/usr/local/bin/filebrowser` via
  `scripts/install-legacy-filebrowser.sh`.
