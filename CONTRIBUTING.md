# Contributing to UnyCloud

UnyCloud is a maintained fork of File Browser.

The project accepts focused maintenance work:

- security fixes;
- dependency updates;
- compatibility fixes for existing File Browser behavior;
- tests that lock down inherited behavior;
- documentation that helps operators migrate without changing config.

Avoid broad rewrites, product-direction changes, or migrations that break old
File Browser deployments unless they are required by a security fix and include
a clear migration path.

## Build

```sh
scripts/build.sh
```

## Security Scan

```sh
scripts/security-scan.sh
```

Install `govulncheck` if needed:

```sh
go install golang.org/x/vuln/cmd/govulncheck@latest
```

## CLI Documentation

Command-line documentation is generated from the commands:

```sh
task docs:cli:generate
```
