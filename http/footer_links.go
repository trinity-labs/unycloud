package fbhttp

import (
	"net/url"
	"os"
	"strings"
)

type footerLink struct {
	URL   string `json:"url"`
	Label string `json:"label"`
	Icon  string `json:"icon"`
}

func runtimeFooterLinks() []footerLink {
	links := make([]footerLink, 0, 2)
	for _, item := range []struct {
		prefix string
		footerLink
	}{
		{"UNYCLOUD_DOCS", footerLink{"https://docs.trinity-net.com/unycloud/", "Docs UnyCloud", "nav-books-icon"}},
		{"UNYCLOUD_GIT", footerLink{"https://github.com/trinity-labs/unycloud", "GitHub", "fa-brands fa-git-alt"}},
	} {
		link := item.footerLink
		if value, exists := os.LookupEnv(item.prefix + "_URL"); exists {
			link.URL = strings.TrimSpace(value)
		}
		parsed, err := url.Parse(link.URL)
		if err != nil || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Hostname() == "" || parsed.User != nil {
			continue
		}
		if label := strings.TrimSpace(os.Getenv(item.prefix + "_LABEL")); label != "" {
			link.Label = label
		}
		links = append(links, link)
	}
	return links
}
