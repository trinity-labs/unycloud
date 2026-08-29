package fbhttp

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/filebrowser/filebrowser/v2/version"
)

const latestReleaseURL = "https://api.github.com/repos/trinity-labs/unycloud/releases/latest"

type versionCheckResponse struct {
	Current        string `json:"current"`
	Latest         string `json:"latest,omitempty"`
	UpdateRequired bool   `json:"updateRequired"`
	CheckURL       string `json:"checkUrl"`
	Error          string `json:"error,omitempty"`
}

var versionCheckCache = struct {
	sync.Mutex
	value   versionCheckResponse
	expires time.Time
}{}

func versionCheckHandler(w http.ResponseWriter, r *http.Request, _ *data) (int, error) {
	now := time.Now()
	versionCheckCache.Lock()
	if now.Before(versionCheckCache.expires) {
		cached := versionCheckCache.value
		versionCheckCache.Unlock()
		return renderJSON(w, r, cached)
	}
	versionCheckCache.Unlock()

	resp := versionCheckResponse{
		Current:  cleanVersion(version.Version),
		CheckURL: "https://github.com/trinity-labs/unycloud/releases/latest",
	}

	latest, err := fetchLatestUnyCloudVersion(r.Context())
	if err != nil {
		resp.Error = "latest_version_unavailable"
	} else {
		resp.Latest = latest
		resp.UpdateRequired = compareVersions(resp.Current, latest) < 0
	}

	versionCheckCache.Lock()
	versionCheckCache.value = resp
	versionCheckCache.expires = now.Add(30 * time.Minute)
	versionCheckCache.Unlock()

	return renderJSON(w, r, resp)
}

func fetchLatestUnyCloudVersion(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, latestReleaseURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "UnyCloud/"+cleanVersion(version.Version))

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode > 299 {
		return "", http.ErrNoLocation
	}

	var body struct {
		TagName string `json:"tag_name"`
		Name    string `json:"name"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return "", err
	}

	if body.TagName != "" {
		return cleanVersion(body.TagName), nil
	}
	return cleanVersion(body.Name), nil
}

func cleanVersion(v string) string {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "UnyCloud ")
	v = strings.TrimPrefix(v, "v")
	if i := strings.IndexByte(v, '/'); i >= 0 {
		v = v[:i]
	}
	return v
}

func compareVersions(a, b string) int {
	ap := versionParts(a)
	bp := versionParts(b)
	for i := 0; i < 3; i++ {
		if ap[i] < bp[i] {
			return -1
		}
		if ap[i] > bp[i] {
			return 1
		}
	}
	return 0
}

func versionParts(v string) [3]int {
	var out [3]int
	parts := strings.Split(cleanVersion(v), ".")
	for i := 0; i < len(parts) && i < 3; i++ {
		n, err := strconv.Atoi(parts[i])
		if err == nil {
			out[i] = n
		}
	}
	return out
}
