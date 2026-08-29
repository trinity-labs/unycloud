# Security Policy

## Supported Versions

UnyCloud starts support at `v0.0.1`.

| Version | Supported |
| ------- | --------- |
| 0.x     | Yes       |

UnyCloud is derived from File Browser. Historical File Browser advisories remain
relevant when assessing inherited code:
https://github.com/filebrowser/filebrowser/security/advisories

## Reporting a Vulnerability

Report vulnerabilities privately through GitHub Security Advisories for this
repository when available. If private reporting is unavailable, open a minimal
issue without exploit details and request a private contact path.

Please include, where possible:

- the UnyCloud version or commit;
- whether the deployment enables command execution;
- the authentication method in use;
- a plaintext proof of concept;
- expected and actual behavior;
- any recommended remediation.

## Security Defaults

The fork keeps File Browser compatibility, but security fixes may tighten risky
behavior when needed. Security changes should preserve the existing config, CLI,
database, API, and `FB_*` environment variables unless there is no practical
safe alternative.
