package fbhttp

import (
	"fmt"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRequestRateLimitKeyIgnoresForwardedHeaders(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/login", nil)
	req.RemoteAddr = "198.51.100.10:43210"
	req.Header.Set("X-Forwarded-For", "203.0.113.99")
	req.Header.Set("X-Real-IP", "203.0.113.100")

	got := requestRateLimitKey("login", req)
	want := "login:198.51.100.10"
	if got != want {
		t.Fatalf("requestRateLimitKey() = %q, want %q", got, want)
	}
}

func TestFailureRateLimiterPrunesExpiredEntries(t *testing.T) {
	limiter := newFailureRateLimiter(1, time.Nanosecond)
	limiter.fail("first")
	time.Sleep(time.Millisecond)
	limiter.fail("second")

	if len(limiter.entries) != 1 {
		t.Fatalf("entries = %d, want 1 after expired entry pruning", len(limiter.entries))
	}
}

func TestFailureRateLimiterCapsEntries(t *testing.T) {
	limiter := newFailureRateLimiter(1, time.Hour)
	for i := 0; i < failureRateLimitMaxEntries+32; i++ {
		limiter.fail(fmt.Sprintf("key-%d", i))
	}

	if len(limiter.entries) > failureRateLimitMaxEntries {
		t.Fatalf("entries = %d, want at most %d", len(limiter.entries), failureRateLimitMaxEntries)
	}
}
