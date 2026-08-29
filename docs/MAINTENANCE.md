# UnyCloud Maintenance

UnyCloud is a maintained fork of File Browser, derived from
`filebrowser/filebrowser` under Apache-2.0.

The maintenance policy is conservative:

- keep the File Browser CLI, flags, config files, database, API, and `FB_*`
  environment variables compatible;
- keep the native feature set available;
- patch security issues in place instead of forcing a new architecture;
- avoid migrations unless required by a security or correctness fix.

## Build

```sh
scripts/build.sh
```

The default artifact is `dist/unycloud`.

Container images are local for `v0.1.0`:

```sh
scripts/build.sh
docker build -t unycloud:local .
```

## Security Scan

```sh
scripts/security-scan.sh
```

This runs:

- CSP source audit;
- Go tests;
- `govulncheck`;
- production dependency audit for the frontend.

Install `govulncheck` if missing:

```sh
go install golang.org/x/vuln/cmd/govulncheck@latest
```

## Legacy Runtime Install

Existing File Browser deployments can keep their service command pointing at
`/usr/local/bin/filebrowser`. Build UnyCloud, then install the artifact to that
legacy path inside a mounted server root:

```sh
UNYCLOUD_INSTALL_ROOT=/mnt/server-root scripts/install-legacy-filebrowser.sh
```

The script requires `UNYCLOUD_INSTALL_ROOT`, preserves the previous executable
as a timestamped `.bak`, and does not restart a service.

## Reverse Proxy

A generic nginx example is provided in
[`examples/nginx/unycloud.conf`](../examples/nginx/unycloud.conf). Keep
site-specific domains, certificates, upstreams, and private paths outside this
repository.
