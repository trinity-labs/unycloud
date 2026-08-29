package fbhttp

import (
	"net"
	"net/http"
	"sync"
	"time"
)

const failureRateLimitMaxEntries = 16384

type failureRateLimiter struct {
	mu      sync.Mutex
	max     int
	window  time.Duration
	entries map[string]failureWindow
}

type failureWindow struct {
	count   int
	resetAt time.Time
}

type failureRateLimiterStats struct {
	Active        int `json:"active"`
	Blocked       int `json:"blocked"`
	Max           int `json:"max"`
	WindowSeconds int `json:"windowSeconds"`
}

func newFailureRateLimiter(max int, window time.Duration) *failureRateLimiter {
	return &failureRateLimiter{
		max:     max,
		window:  window,
		entries: map[string]failureWindow{},
	}
}

func (l *failureRateLimiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	l.pruneExpired(now)

	entry, ok := l.entries[key]
	if !ok || now.After(entry.resetAt) {
		return true
	}

	return entry.count < l.max
}

func (l *failureRateLimiter) fail(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	l.pruneExpired(now)

	entry, ok := l.entries[key]
	if !ok || now.After(entry.resetAt) {
		if len(l.entries) >= failureRateLimitMaxEntries {
			l.evictOne()
		}
		l.entries[key] = failureWindow{count: 1, resetAt: now.Add(l.window)}
		return
	}

	entry.count += 1
	l.entries[key] = entry
}

func (l *failureRateLimiter) reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, key)
}

func (l *failureRateLimiter) stats() failureRateLimiterStats {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.pruneExpired(time.Now())
	stats := failureRateLimiterStats{
		Active:        len(l.entries),
		Max:           l.max,
		WindowSeconds: int(l.window.Seconds()),
	}

	for _, entry := range l.entries {
		if entry.count >= l.max {
			stats.Blocked++
		}
	}

	return stats
}

func (l *failureRateLimiter) pruneExpired(now time.Time) {
	for key, entry := range l.entries {
		if now.After(entry.resetAt) {
			delete(l.entries, key)
		}
	}
}

func (l *failureRateLimiter) evictOne() {
	for key := range l.entries {
		delete(l.entries, key)
		return
	}
}

func requestPeerAddr(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}

	return host
}

func requestRateLimitKey(prefix string, r *http.Request, parts ...string) string {
	key := prefix + ":" + requestPeerAddr(r)
	for _, part := range parts {
		key += ":" + part
	}
	return key
}

var (
	loginFailureLimiter = newFailureRateLimiter(10, time.Minute)
	shareFailureLimiter = newFailureRateLimiter(20, time.Minute)
)
