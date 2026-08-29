package fbhttp

import (
	"net"
	"net/http"
	"net/url"
	"strings"
	"unicode"

	"github.com/filebrowser/filebrowser/v2/auth"
	"github.com/filebrowser/filebrowser/v2/storage"
)

func setSecurityHeaders(w http.ResponseWriter, r *http.Request, store *storage.Storage) {
	for k, v := range globalHeaders {
		w.Header().Set(k, v)
	}

	w.Header().Set("Content-Security-Policy", contentSecurityPolicy(r, store))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "SAMEORIGIN")
	w.Header().Set("Referrer-Policy", "same-origin")
	w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()")

	if requestIsHTTPS(r) {
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
	}
}

func contentSecurityPolicy(r *http.Request, store *storage.Storage) string {
	recaptchaSources := recaptchaCSPSources(store)
	scriptSources := sourceSuffix(recaptchaSources.script)
	connectSources := sameHostWebSocketSources(r)
	connectSources = append(connectSources, recaptchaSources.connect...)

	directives := []string{
		"default-src 'self'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'",
		"object-src 'none'",
		"script-src 'self'" + scriptSources,
		"script-src-elem 'self'" + scriptSources,
		"script-src-attr 'none'",
		"style-src 'self'",
		"style-src-elem 'self'",
		"style-src-attr 'none'",
		"img-src 'self' data: blob:",
		"font-src 'self' data:",
		"connect-src 'self'" + sourceSuffix(connectSources),
		"media-src 'self' blob:",
		"frame-src 'self' blob:" + sourceSuffix(recaptchaSources.frame),
		"child-src 'self' blob:",
		"worker-src 'self' blob:",
		"manifest-src 'self'",
		"upgrade-insecure-requests",
	}

	return strings.Join(directives, "; ") + ";"
}

func enforceSameOriginRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if sameOriginViolation(r) {
			recordSecurityEvent(r, "origin_rejected", http.StatusForbidden, "")
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func sameOriginViolation(r *http.Request) bool {
	switch r.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions, http.MethodTrace:
		return false
	}

	origin := r.Header.Get("Origin")
	if origin == "" {
		return false
	}

	return !strings.EqualFold(origin, requestOrigin(r))
}

func requestOrigin(r *http.Request) string {
	host := r.Host
	if host == "" {
		host = r.URL.Host
	}
	if !validCSPHost(host) {
		return ""
	}

	scheme := "http"
	if requestIsHTTPS(r) {
		scheme = "https"
	}

	return scheme + "://" + host
}

func requestIsHTTPS(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

type recaptchaSources struct {
	script  []string
	connect []string
	frame   []string
}

func recaptchaCSPSources(store *storage.Storage) recaptchaSources {
	empty := recaptchaSources{}
	if store == nil {
		return empty
	}

	settings, err := store.Settings.Get()
	if err != nil || settings.AuthMethod != auth.MethodJSONAuth {
		return empty
	}

	raw, err := store.Auth.Get(settings.AuthMethod)
	if err != nil {
		return empty
	}

	jsonAuth, ok := raw.(*auth.JSONAuth)
	if !ok || jsonAuth.ReCaptcha == nil || jsonAuth.ReCaptcha.Host == "" {
		return empty
	}

	parsed, err := url.Parse(jsonAuth.ReCaptcha.Host)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return empty
	}

	if parsed.Scheme != "https" && parsed.Scheme != "http" {
		return empty
	}

	origin := parsed.Scheme + "://" + parsed.Host
	return recaptchaSources{
		script:  []string{origin, "https://www.gstatic.com"},
		connect: []string{origin},
		frame:   []string{origin, "https://recaptcha.google.com"},
	}
}

func sameHostWebSocketSources(r *http.Request) []string {
	host := r.Host
	if host == "" {
		host = r.URL.Host
	}
	if !validCSPHost(host) {
		return nil
	}

	return []string{"ws://" + host, "wss://" + host}
}

func validCSPHost(host string) bool {
	if host == "" || strings.ContainsAny(host, "\r\n\t /;") {
		return false
	}

	hostOnly, _, err := net.SplitHostPort(host)
	if err == nil {
		host = hostOnly
	}

	if strings.HasPrefix(host, "[") && strings.HasSuffix(host, "]") {
		host = strings.TrimPrefix(strings.TrimSuffix(host, "]"), "[")
		return net.ParseIP(host) != nil
	}

	for _, r := range host {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '.' || r == ':' {
			continue
		}
		return false
	}

	return true
}

func sourceSuffix(sources []string) string {
	if len(sources) == 0 {
		return ""
	}

	unique := make([]string, 0, len(sources))
	seen := map[string]struct{}{}
	for _, source := range sources {
		if source == "" {
			continue
		}
		if _, ok := seen[source]; ok {
			continue
		}
		seen[source] = struct{}{}
		unique = append(unique, source)
	}

	if len(unique) == 0 {
		return ""
	}

	return " " + strings.Join(unique, " ")
}
