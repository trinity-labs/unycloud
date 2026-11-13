package fbhttp

import (
	"net/http/httptest"
	"testing"
)

func TestPermissionsPolicySupportedDirectives(t *testing.T) {
	w := httptest.NewRecorder()
	setSecurityHeaders(w, httptest.NewRequest("GET", "https://example.com/login", nil), nil)
	const want = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()"
	if got := w.Header().Get("Permissions-Policy"); got != want {
		t.Fatalf("Permissions-Policy = %q, want %q (without interest-cohort)", got, want)
	}
}
