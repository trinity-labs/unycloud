# CLAUDE.md

Guidance for Claude when working in this repository: UnyCloud, a maintained
security-focused fork of File Browser.

## Repo Orientation

- Repository: `trinity-labs/unycloud`.
- Upstream lineage: `filebrowser/filebrowser`, Apache-2.0.
- Go module path is intentionally still `github.com/filebrowser/filebrowser/v2`
  for compatibility. Do not rename it casually.
- Backend: Go. Frontend: Vue under `frontend/`.
- Version scheme starts at `v0.0.x` for UnyCloud.
- Compatibility is mandatory: preserve File Browser CLI flags, config files,
  database layout, API behavior, `FB_*` environment variables, and legacy
  executable path support.

## Security Baseline

- No `unsafe-inline`, `unsafe-eval`, CSP hashes, or nonce workarounds.
- No inline `<script>`, inline `<style>`, `style=""`, Vue `:style`, or `v-show`
  in application code.
- Do not add dependencies that inject styles/scripts at runtime unless the CSP
  contract is updated with a safe, deterministic mechanism.
- Do not use `innerHTML` except for explicitly sanitized content. Markdown
  preview must sanitize with DOMPurify and forbid `style` attributes/tags.
- Keep `object-src 'none'`. Embedded previews should use safer primitives such
  as sandboxed iframes where needed.
- Do not trust `X-Forwarded-For` or `X-Real-IP` inside the app unless a trusted
  proxy model is implemented explicitly.
- Command execution and hooks are high-risk areas. Keep them disabled by
  default, covered by tests, bounded by timeouts, and protected against shell
  allowlist bypasses.
- Public login/share surfaces need throttling, bounded request bodies, and
  tests for abuse cases.
- Login/session hardening includes server-issued HttpOnly cookies, same-origin
  write checks, password-manager-ready fields, and stable `unycloud_security`
  event logs for fail2ban.
- `/api/security/status`, `/api/security/events`, and
  `/api/security/fail2ban` must remain admin-only.

## Required Checks

Run these before finishing security or release work:

```sh
scripts/csp-audit.sh
scripts/build.sh
scripts/security-scan.sh
go vet ./...
go test -race ./http ./auth ./runner ./files ./fileutils ./users
cd frontend && pnpm run lint && pnpm run test
```

When checking a private reverse proxy config, keep the path outside the repo and
pass it explicitly:

```sh
UNYCLOUD_NGINX_CONFIG=/path/to/nginx.conf scripts/csp-audit.sh
```

Private branding files are not source truth. Keep them same-origin only: no CDN
`@import`, no custom JS autofill shim, no secrets, and no private paths in Git.

## Security Advisory Workflow

Use GitHub security advisories on `trinity-labs/unycloud`.

```sh
gh api '/repos/trinity-labs/unycloud/security-advisories?state=triage&per_page=100' \
  --jq '.[] | {ghsa_id, severity, summary, state}'

gh api /repos/trinity-labs/unycloud/security-advisories/GHSA-xxxx-xxxx-xxxx \
  --jq '.summary, "---", .description'
```

For every report, verify the code at HEAD before accepting the claim:

- `CONFIRMED`: defect exists; cite exact file and line.
- `FIXED`: already patched; cite fix commit.
- `FALSE / NOT APPLICABLE`: wrong claim or wrong project.
- `NOT EXPLOITABLE`: code exists but preconditions cannot be reached.
- `DUPLICATE`: already covered by a published or triaged advisory.

For confirmed issues:

- one focused fix per advisory where practical;
- regression test with the fix;
- CVSS v3.1 vector based on real exploit preconditions;
- advisory body in maintainer voice with `Summary`, `Details`, `PoC`, `Impact`,
  `Patches`, `Workarounds`, and `References` sections as applicable.

The Go package name for advisories remains
`github.com/filebrowser/filebrowser/v2` until a deliberate module migration is
planned and documented.

## Release Workflow

- Keep private deployment paths, domains, tokens, SSH material, and local
  server config out of the repository.
- `dist/` is ignored; release artifacts are generated from the tagged commit.
- Version source of truth is `UNYCLOUD_VERSION`; `scripts/build.sh` reads it
  unless `UNYCLOUD_VERSION` is passed explicitly.
- Auto-sync mirrors the docs watcher:
  `watch-unycloud.sh once|start|stop|status` runs CSP audit, build, then
  `scripts/sync-unycloud-git.sh` if `UNYCLOUD_GIT_SYNC_ENABLED=1`.
- `scripts/sync-unycloud-git.sh` must refuse commit/push unless a build was
  verified (`UNYCLOUD_GIT_REQUIRE_BUILD=1`, default). Prefer the watcher path.
- Keep `unycloud-git-sync.env` local; commit only
  `unycloud-git-sync.env.example`.
- `v0.0.1` publishes binary archives. Docker/Compose examples build local images
  from `dist/unycloud`.
- Existing deployments can install `dist/unycloud` to
  `/usr/local/bin/filebrowser` using `scripts/install-legacy-filebrowser.sh`.

Use GoReleaser in CI when the `v*` tag is pushed. If publishing manually, never
print tokens; read them from the local GitHub config or environment.
