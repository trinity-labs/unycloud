# UnyCloud v0.17.0

UnyCloud is a maintained File Browser fork focused on security, speed, and full legacy compatibility.

✅Moved the project toolchain to Go 1.27.0.
✅Updated sensitive Go modules, including `x/crypto`, `x/net`, `x/text`, and `x/image`.
✅Validated `go mod tidy` with no unused dependency left.
✅Rebuilt `govulncheck` with Go 1.27.
✅Confirmed `govulncheck` with no reachable vulnerability.
✅Upgraded frontend dependencies.
✅Pinned security overrides for `rollup >= 4.59.0` and `esbuild >= 0.28.1`.
✅Validated `pnpm audit --prod`.
✅Kept TypeScript on a Vue/ESLint-compatible version.
✅Pinned Docker base images.
✅Replaced `redis:latest` with `redis:8.4-alpine`.
✅Removed the static Redis password.
✅Required `UNYCLOUD_REDIS_PASSWORD`.
✅Kept `.env` out of Git.
✅Added `.env.example`.
✅Enforced strict CSP without `unsafe-inline`.
✅Enforced strict CSP without `unsafe-eval`.
✅Removed unmanaged inline runtime execution.
✅Removed the blob manifest.
✅Served the manifest from same origin.
✅Served runtime assets locally.
✅Bundled Font Awesome locally.
✅Hardened login requests with same-origin credentials.
✅Disabled login request caching.
✅Blocked fetch redirects with `redirect:error`.
✅Blocked empty login submissions before `/api/login`.
✅Internationalized login validation messages.
✅Centralized notifications into one toast.
✅Made each toast replace the previous one.
✅Set toast expiration to 5 seconds.
✅Rate-limited login by `RemoteAddr`.
✅Ignored untrusted proxy headers for app rate limits.
✅Rate-limited public share access.
✅Hardened auth cookies with `HttpOnly`, `SameSite=Strict`, and HTTPS `Secure`.
✅Restricted JWT validation to expected `HS256`.
✅Required JWT expiration.
✅Checked `Origin` on mutating requests.
✅Bounded sensitive request bodies with `MaxBytesReader`.
✅Hardened proxy authentication renewal.
✅Prevented signup from creating admins.
✅Prevented default `Execute` permission inheritance.
✅Cleared user commands on signup.
✅Rejected weak passwords.
✅Stopped exposing share tokens through the API.
✅Compared sensitive tokens in constant time.
✅Validated symlink protections.
✅Added `unycloud_security` logs.
✅Restricted `/api/security/*` to admins.
✅Integrated fail2ban with app and nginx logs.
✅Detected `/api/login` brute force attempts.
✅Aligned bans with the TRINITY edge policy.
✅Allowed France-only access at the edge.
✅Blocked TOR, VPN, datacenter, and suspicious ASN traffic by policy.
✅Kept allowed proxies compatible with TRINITY rules.
✅Served Brotli first.
✅Kept gzip fallback.
✅Used immutable caching for hashed assets.
✅Kept runtime files out of long cache.
✅Cached previews privately with ETag.
✅Set server `IdleTimeout` to 120 seconds.
✅Preserved large uploads, downloads, and TUS transfers.
✅Lazy-loaded i18n locales.
✅Reduced the initial bundle size.
✅Embedded UnyCloud as the default template.
✅Kept the File Browser runtime contract.
✅Kept legacy paths.
✅Automated version bumps.
✅Blocked commit/push when validation fails.
✅Automated Git tags.
✅Automated GitHub Releases.
✅Made release publication idempotent.
✅Validated `lint`, `test`, `build`, `vet`, and race checks.
✅Validated security and CSP scans.
✅Polished the menu version badge for clearer update status.
