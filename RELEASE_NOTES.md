# UnyCloud v0.5.0

UnyCloud starts as a maintained fork of File Browser
(`filebrowser/filebrowser`) under Apache-2.0.

This first release keeps the File Browser runtime contract: existing CLI flags,
config files, database layout, API behavior, and `FB_*` environment variables
remain the compatibility target.

## Security And Maintenance

- Stable CSP without inline script/style escape hatches or rebuild-dependent
  hashes.
- Runtime bootstrap and loading CSS moved out of inline HTML.
- Runtime style-injecting frontend dependencies removed or replaced, including
  Ace, vue-reader, video.js, and the previous number input package.
- Native CSP-safe editor, video preview, and sandboxed PDF preview.
- Embedded EPUB reader disabled until it can meet the same CSP contract.
- PWA manifest served as same-origin JSON instead of a generated blob URL.
- Login form fields now carry browser password-manager attributes directly.
- Bounded login and protected public-share failure rate limiting added using
  the socket peer address.
- Stable `unycloud_security` log lines and admin-only security endpoints added
  for fail2ban/server monitoring.
- Server-issued auth cookies use `HttpOnly`, `SameSite=Strict`, and HTTPS
  `Secure`.
- Cross-origin browser write requests are rejected when a foreign `Origin`
  header is present.
- Global security headers added.
- JSON body size limits added to mutation endpoints.
- Hook authentication output and runtime are bounded.
- Interactive command execution tightened and bounded by timeout when shell mode
  is configured.
- Generic build, CSP audit, CVE scan, and legacy install scripts added.
- Dependabot and `govulncheck` CI coverage added.

## Compatibility

The release artifact is named `unycloud`. Existing services may still install
that artifact at `/usr/local/bin/filebrowser` to preserve service compatibility.

Container images are not published as part of `v0.5.0`; the repository includes
a generic local Docker/Compose setup that builds from `dist/unycloud`.
