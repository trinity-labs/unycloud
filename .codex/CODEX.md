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

- Use the pinned Go toolchain from `go.mod` (`go1.27.3` since 2026-10-27).
- Run `govulncheck` and production `pnpm audit` before release.
- Keep Dependabot config active for Go modules and frontend packages.
- When updating dependencies, verify that the replacement does not weaken CSP or
  introduce runtime style/script injection.
- Do not suppress vulnerability reports without code-path analysis.

## Current Advancement

### Popup Presentation (2026-11-08)

- Existing popup titles include decorative action icons in the primary color
  at 66% opacity. Shared title layout supports wrapping without shrinking icons.
- Import choices use borderless buttons and the theme background, while keeping
  visible keyboard focus. Keep these styles in the app, never in custom branding
  or selectors tied to generated Vue scope hashes.

### Native Number Controls (2026-11-07)

- The CSP-safe number input renders explicit minus/plus icons inside keyboard
  accessible buttons, with static theme-aware styles and disabled boundary states.
- Input IDs belong to the native input, not the wrapper, so settings labels focus
  the field. Keep direct numeric entry and the existing bounds/step behavior.
- Rendering tests guard the controls, input ID and minimum/maximum button states.

### Local Scheduled Theme (2026-11-07)

- Header theme control cycles light, dark, auto and saves the preference locally.
- Auto is the default when no valid local preference exists; saved light/dark
  choices remain unchanged.
- Auto uses device local time: light from 08:00 inclusive to 20:00 exclusive,
  dark otherwise. It does not follow the operating system theme.
- Refresh while open and on focus/visibility return keeps theme-color metadata
  aligned with the resolved theme. Manual choices bypass the schedule.
- Regression tests cover boundaries, cycling, persistence, metadata and cleanup.

### Watcher Git Synchronization (2026-11-06)

- When Git sync is enabled, pending tracked/untracked changes trigger a cycle
  even if the filesystem fingerprint was initialized after the edits. Local
  commits ahead of the upstream branch also trigger a retry of publication.
- An active watcher is not evidence of publication: verify the remote commit,
  working tree and deployment separately. Exclude private scratch workspaces
  locally before enabling automatic staging.

### Search Controls (2026-11-06)

- File-type filters use native keyboard-accessible buttons in a compact two-column
  grid, with theme-aware colors and 4px corners instead of large circular tiles.
- Pointer presses outside the search input and result content dismiss the search,
  including the empty fullscreen background. Internal controls remain usable;
  the existing close lifecycle aborts active requests and clears search state.
- The document listener is removed when the component unmounts. Static regression
  guards cover button/grid structure and listener cleanup; they do not replace
  visual or browser interaction testing.

### Confirmed Username Autofill Fix (2026-11-07)

#### Controlled Browser Trials

- Change one factor per trial; preserve Password and authentication behavior.
  Do not stack another trial before the user reports the preceding result.
- Baseline `2e15121f`: user reports no saved-account suggestions on Username
  on desktop or mobile; Password suggestions and sign-in work.
- Trial A: remove only the form's `id="login-form"` and `name="login"`,
  introduced in `11a3c4ae`. Keep input identities, autocomplete, POST method,
  action and submit handler unchanged. Deployed commit: `9adacea7`.
  Native-browser result: SUCCESS, confirmed by the user on 2026-11-07 after
  testing Username first. The confirmation did not specify device/browser
  versions or separate desktop/mobile results; do not claim both were tested.
- Preserve the confirmed form without `id` or `name`; preserve the INPUT
  `id="username"`, `name="username"` and `autocomplete="username"`.
  `scripts/login-form.test.mjs` guards this distinction during every build.
  Removing the pair was successful; this does not isolate which attribute or
  browser heuristic was responsible. Do not revert to text/email experiments.
- For each trial, record the deployed commit, browser/device, whether Username
  suggestions appear before touching Password, whether selecting an account
  fills both fields, and whether sign-in succeeds. Never record credentials.
- Once a successful variant is confirmed, explicitly record it here with the
  failing baseline, exact change, user-confirmed results and regression checks.
  A build or markup test alone is not a successful native-autofill result.

- Follow-up on 2026-11-07: the user confirms typing and sign-in work, but native
  suggestions still appear only on Password on desktop and mobile. The earlier
  text-type/focus change did not resolve the reported issue.
- At the user's request, Username is reduced to a native text input with stable
  id/name, username autocomplete, its associated label, styling and Vue value/
  placeholder bindings. Extra keyboard, correction and redundant ARIA attributes
  are removed. Password is unchanged. Keep this field minimal; do not claim
  native autofill is fixed until verified with saved credentials.
- Recurring user report: clicking the username field does not offer saved
  credentials, whereas clicking the password field does. The username field is
  also reported as not clickable. Distinguish failure to receive focus from
  failure to open the browser's password-manager suggestions during diagnosis.
- Historical status before Trial A: candidate fix, not browser-validated.
  The username field incorrectly used `type="email"` for arbitrary usernames;
  it now uses `type="text"` and no longer takes focus automatically on load.
  This is not proof of the cause of a pointer/focus failure. The screenshot demonstrates suggestions on the password
  field, not successful username interaction. Do not mark this fixed based on
  autocomplete attributes, a successful build or password-field autofill alone.
- `frontend/src/views/Login.vue` already declares `id="username"`,
  `name="username"` and `autocomplete="username"`. Check the deployed DOM and
  assets, overlays, pointer events, focus handlers and field replacement before
  attributing the regression to missing attributes or browser caching.
- Preserve native form semantics: stable username/password fields in the same
  form, username autocomplete and current-password autocomplete for sign-in.
  Do not introduce readonly-on-load tricks, hidden duplicate login fields,
  focus redirection to the password field or proxy-injected autofill scripts.
- Required regression check after login markup, CSS, theme or dependency changes:
  with credentials saved for the test origin in Chrome, click/tap Username first
  without touching Password. Verify focus, typing, saved-account suggestions,
  selection filling both fields and successful submission. Repeat after reload
  and logout, in light/dark themes, desktop/mobile and installed PWA where used.
- Add automated coverage for username hit testing, focus, editability and form
  attributes when fixing this issue. Native password-manager suggestions also
  require a real browser profile with saved credentials; record that manual
  result separately and explicitly report when it has not been tested.
- Before closing the regression, verify that the deployed binary serves the
  tested frontend. Keep test credentials and private deployment details out of
  this public document.
- `scripts/login-form.test.mjs` checks the parsed Vue template for the native
  editable username field and shared form. The build runs this guard after
  dependency installation. It does not test hit testing or native suggestions.
- Candidate deployed on 2026-11-06 after a successful full build, lint, 31
  frontend tests, 2 login structure tests, Go tests and security scans (no called
  vulnerabilities). The restarted process matches the built binary; login
  responds with HTTP 200. Real-profile Chrome suggestion validation remains open.

### Maintenance Publication (2026-10-30)

- Publish the pending PWA navigation, passive touch listener, Go toolchain and
  dependency maintenance changes without changing the application version.
- Go dependencies include `golang.org/x/net v0.62.0`; frontend dependencies and
  the lockfile are aligned. The Docker fetcher uses Alpine 3.24.3.
- Fresh validation passed: full build, CSP audit, lint, typecheck, 31 frontend
  tests, 4 service-worker tests, Go tests, vet and targeted race tests.
- Production package audit reports no known vulnerabilities. Go vulnerability
  scanning reports no called vulnerabilities; one module-level advisory remains
  outside imported packages.
- Generated artifacts and the unrelated nested workspace are excluded from Git.

### PWA Navigation And Touch Listeners

- Service worker interception is limited to bundled static assets. Navigations,
  authentication, API requests, and manifests use the browser network path.
- Cache misses return a valid error response; cache write failures do not reject
  successful asset requests. Asset matching respects the application scope.
- Touch listeners that do not cancel scrolling are passive; image pan/zoom keeps
  its existing gesture handling.
- Regression checks: `node --test scripts/service-worker.test.mjs` (4 tests),
  frontend tests (31), lint, typecheck, CSP audit, and Go tests passed.
- The 12 called standard-library vulnerabilities reported against the previous
  `go1.27.0` pin are resolved by the `go1.27.3` update below.

### Go 1.27.3 Toolchain Update (2026-10-27)

- Toolchain pins in CI, release configuration, Taskfile and build/security
  scripts are aligned with `go.mod` on `go1.27.3`.
- `golang.org/x/net` was raised to `v0.60.0` and `golang.org/x/crypto` to
  `v0.58.0`; the module graph was tidied.
- The update passed Go tests, vet, targeted race tests and the CSP audit.
- The recorded vulnerability scan found no vulnerabilities called by application
  code. The unimported `golang.org/x/crypto/openpgp` advisory `GO-2026-5932`
  had no upstream fix and was not reachable from this code base.
- The application binary was rebuilt with Go 1.27.3 and deployed successfully.

### v0.29.0 Dependency And Security Maintenance

- Frontend production dependencies were updated for maintenance and security:
  `csv-parse`, `dompurify`, `filesize`, `js-base64`, `marked`,
  `marked-katex-extension`, `pretty-bytes`, `qrcode.vue`, `vue`, `vue-i18n`,
  and `vue-router`.
- Frontend build/dev dependencies were updated: `@typescript-eslint/*`,
  `@vitejs/plugin-vue`, `autoprefixer`, `eslint`, `eslint-plugin-vue`,
  `postcss`, `prettier`, `vite`, and `vue-tsc`.
- Security overrides were aligned for vulnerable transitive packages:
  `brace-expansion`, `katex`, `postcss-selector-parser`, `source-map-js`,
  `dompurify`, and `postcss`.
- Go dependency check was run with `go get -u=patch ./... && go mod tidy`;
  no Go module diff was produced in this pass.
- `govulncheck ./...` reports no vulnerabilities called by application code.
- `pnpm audit --prod` reports no known production vulnerabilities.
- Full frontend/Go build and tests passed through the release automation path.
- Release automation created commit `cb72aab2` with tag `v0.29.0`.
- One development-only audit warning remains for `braces` through
  `@intlify/unplugin-vue-i18n > fast-glob > micromatch`; npm currently reports
  no patched version for that advisory.
- PWA install handling now leaves Chromium's native `beforeinstallprompt`
  event unmanaged to avoid the browser warning produced when `preventDefault()`
  is called without a later user-gesture `prompt()`.

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

- Dark body/main no longer override the background with radial gradients.
  Preserve the base background and deployment branding cascade.

- Sidebar icons use a fixed 1.5rem box with a 1rem glyph. Keep the light
  color #cecece and dark color #878787b0; preserve the logout color override.

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
- With `UNYCLOUD_GIT_AUTO_BUMP=1` (default), sync bumps `UNYCLOUD_VERSION`
  automatically from detected change kind before committing.
- Keep `unycloud-git-sync.env` local; commit only
  `unycloud-git-sync.env.example`.
- `v0.0.1` publishes binary archives; Docker/Compose examples build local images
  from `dist/unycloud`.
- Legacy installs can keep `/usr/local/bin/filebrowser` via
  `scripts/install-legacy-filebrowser.sh`.
