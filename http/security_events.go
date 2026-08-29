package fbhttp

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"
)

const securityEventLimit = 512

type securityEvent struct {
	Timestamp string `json:"timestamp"`
	Type      string `json:"type"`
	Remote    string `json:"remote"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Status    int    `json:"status"`
	Username  string `json:"username,omitempty"`
	UserAgent string `json:"userAgent,omitempty"`
}

var securityEventStore = struct {
	sync.Mutex
	events []securityEvent
}{
	events: make([]securityEvent, 0, securityEventLimit),
}

func recordSecurityEvent(r *http.Request, eventType string, status int, username string) {
	event := securityEvent{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Type:      eventType,
		Remote:    requestPeerAddr(r),
		Method:    r.Method,
		Path:      r.URL.Path,
		Status:    status,
		Username:  username,
		UserAgent: r.UserAgent(),
	}

	securityEventStore.Lock()
	if len(securityEventStore.events) >= securityEventLimit {
		copy(securityEventStore.events, securityEventStore.events[1:])
		securityEventStore.events[len(securityEventStore.events)-1] = event
	} else {
		securityEventStore.events = append(securityEventStore.events, event)
	}
	securityEventStore.Unlock()

	log.Printf("unycloud_security event=%s remote=%s method=%s path=%s status=%d username=%q user_agent=%q",
		event.Type, event.Remote, event.Method, event.Path, event.Status, event.Username, event.UserAgent)
}

func recentSecurityEvents(limit int) []securityEvent {
	securityEventStore.Lock()
	defer securityEventStore.Unlock()

	if limit <= 0 || limit > securityEventLimit {
		limit = securityEventLimit
	}
	if limit > len(securityEventStore.events) {
		limit = len(securityEventStore.events)
	}

	start := len(securityEventStore.events) - limit
	out := make([]securityEvent, limit)
	copy(out, securityEventStore.events[start:])
	return out
}

var securityStatusHandler = withAdmin(func(w http.ResponseWriter, r *http.Request, _ *data) (int, error) {
	w.Header().Set("Cache-Control", "no-store")
	return renderJSON(w, r, map[string]interface{}{
		"status":       "OK",
		"events":       len(recentSecurityEvents(securityEventLimit)),
		"loginLimiter": loginFailureLimiter.stats(),
		"shareLimiter": shareFailureLimiter.stats(),
	})
})

var securityEventsHandler = withAdmin(func(w http.ResponseWriter, r *http.Request, _ *data) (int, error) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	w.Header().Set("Cache-Control", "no-store")
	return renderJSON(w, r, recentSecurityEvents(limit))
})

var securityFail2BanHandler = withAdmin(func(w http.ResponseWriter, r *http.Request, _ *data) (int, error) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")

	for _, event := range recentSecurityEvents(limit) {
		_, err := fmt.Fprintf(w, "%s unycloud_security event=%s remote=%s method=%s path=%s status=%d username=%q user_agent=%q\n",
			event.Timestamp, event.Type, event.Remote, event.Method, event.Path, event.Status, event.Username, event.UserAgent)
		if err != nil {
			return 0, err
		}
	}

	return 0, nil
})
