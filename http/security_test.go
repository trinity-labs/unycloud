package fbhttp

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSameHostWebSocketSources(t *testing.T) {
	req := httptest.NewRequest("GET", "https://cloud.example.test/files/", nil)
	req.Host = "cloud.example.test"

	got := sameHostWebSocketSources(req)
	want := []string{"ws://cloud.example.test", "wss://cloud.example.test"}
	if len(got) != len(want) {
		t.Fatalf("sources = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("sources = %v, want %v", got, want)
		}
	}
}

func TestSameHostWebSocketSourcesRejectsInvalidHost(t *testing.T) {
	req := httptest.NewRequest("GET", "https://cloud.example.test/files/", nil)
	req.Host = "cloud.example.test; script-src https://evil.example"

	if got := sameHostWebSocketSources(req); got != nil {
		t.Fatalf("sources = %v, want nil for invalid host", got)
	}
}

func TestSourceSuffixDeduplicates(t *testing.T) {
	got := sourceSuffix([]string{"https://example.test", "", "https://example.test"})
	want := " https://example.test"
	if got != want {
		t.Fatalf("sourceSuffix() = %q, want %q", got, want)
	}
}

func TestContentSecurityPolicyHasNoUnsafeOrHashes(t *testing.T) {
	req := httptest.NewRequest("GET", "https://cloud.example.test/files/", nil)
	req.Host = "cloud.example.test"
	csp := contentSecurityPolicy(req, nil)

	for _, blocked := range []string{"un" + "safe-", "sha" + "256-"} {
		if strings.Contains(csp, blocked) {
			t.Fatalf("CSP contains blocked token %q: %s", blocked, csp)
		}
	}
}

func TestSameOriginViolation(t *testing.T) {
	req := httptest.NewRequest("POST", "https://cloud.example.test/api/login", nil)
	req.Host = "cloud.example.test"
	req.Header.Set("Origin", "https://evil.example")

	if !sameOriginViolation(req) {
		t.Fatal("sameOriginViolation() = false, want true for foreign origin")
	}
}

func TestSetIsolatedContentHeaders(t *testing.T) {
	rec := httptest.NewRecorder()

	setIsolatedContentHeaders(rec)

	csp := rec.Header().Get("Content-Security-Policy")
	for _, directive := range []string{
		"default-src 'none'",
		"base-uri 'none'",
		"form-action 'none'",
		"frame-ancestors 'self'",
		"object-src 'none'",
		"script-src 'none'",
		"style-src 'none'",
	} {
		if !strings.Contains(csp, directive) {
			t.Fatalf("Content-Security-Policy = %q, missing %q", csp, directive)
		}
	}

	if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("X-Content-Type-Options = %q, want nosniff", got)
	}
	if got := rec.Header().Get("Referrer-Policy"); got != "no-referrer" {
		t.Fatalf("Referrer-Policy = %q, want no-referrer", got)
	}
	if got := rec.Header().Get("Cache-Control"); got != "private" {
		t.Fatalf("Cache-Control = %q, want private", got)
	}
}

func TestSameOriginViolationAllowsMatchingOrigin(t *testing.T) {
	req := httptest.NewRequest("POST", "https://cloud.example.test/api/login", nil)
	req.Host = "cloud.example.test"
	req.Header.Set("Origin", "https://cloud.example.test")

	if sameOriginViolation(req) {
		t.Fatal("sameOriginViolation() = true, want false for same origin")
	}
}

func TestSameOriginViolationUsesForwardedProto(t *testing.T) {
	req := httptest.NewRequest("POST", "http://cloud.example.test/api/login", nil)
	req.Host = "cloud.example.test"
	req.Header.Set("X-Forwarded-Proto", "https")
	req.Header.Set("Origin", "https://cloud.example.test")

	if sameOriginViolation(req) {
		t.Fatal("sameOriginViolation() = true, want false behind HTTPS proxy")
	}
}
