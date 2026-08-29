package fbhttp

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurityEventsAreBounded(t *testing.T) {
	securityEventStore.Lock()
	securityEventStore.events = securityEventStore.events[:0]
	securityEventStore.Unlock()

	req := httptest.NewRequest(http.MethodPost, "/api/login", nil)
	req.RemoteAddr = "198.51.100.10:1234"

	for i := 0; i < securityEventLimit+8; i++ {
		recordSecurityEvent(req, "login_failure", http.StatusForbidden, "")
	}

	if got := len(recentSecurityEvents(securityEventLimit)); got != securityEventLimit {
		t.Fatalf("events = %d, want %d", got, securityEventLimit)
	}
}
