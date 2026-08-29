# Security Endpoints

UnyCloud emits stable log lines for fail2ban:

```text
unycloud_security event=login_failure remote=198.51.100.10 method=POST path=/api/login status=403 username="" user_agent="..."
```

Events currently include `login_failure`, `login_throttled`, `login_error`,
`share_failure`, `share_throttled`, and `origin_rejected`.

Admin-only monitoring endpoints:

```text
GET /api/security/status
GET /api/security/events?limit=100
GET /api/security/fail2ban?limit=100
```

`/api/security/fail2ban` returns the in-memory ring buffer in a plaintext
fail2ban-friendly format. Production bans should normally tail the service log,
because it catches events even if the admin endpoint is never polled.
