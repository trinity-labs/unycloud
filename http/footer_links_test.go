package fbhttp

import (
	"os"
	"testing"
)

func TestRuntimeFooterLinks(t *testing.T) {
	for _, key := range []string{"UNYCLOUD_DOCS_URL", "UNYCLOUD_GIT_URL", "UNYCLOUD_DOCS_LABEL", "UNYCLOUD_GIT_LABEL"} {
		t.Setenv(key, "")
		if err := os.Unsetenv(key); err != nil {
			t.Fatal(err)
		}
	}
	links := runtimeFooterLinks()
	if len(links) != 2 || links[0].Label != "Docs UnyCloud" || links[1].URL != "https://github.com/trinity-labs/unycloud" {
		t.Fatalf("unexpected defaults: %+v", links)
	}
	t.Setenv("UNYCLOUD_DOCS_URL", " https://example.org/docs ")
	t.Setenv("UNYCLOUD_DOCS_LABEL", " My docs ")
	t.Setenv("UNYCLOUD_GIT_URL", "")
	links = runtimeFooterLinks()
	if len(links) != 1 || links[0].URL != "https://example.org/docs" || links[0].Label != "My docs" {
		t.Fatalf("unexpected custom links: %+v", links)
	}
	for _, invalid := range []string{"", "   ", "javascript:alert(1)", "data:text/html,test", "//example.org", "/docs", "https://", "https://user:password@example.org", "%"} {
		t.Setenv("UNYCLOUD_DOCS_URL", invalid)
		if links := runtimeFooterLinks(); len(links) != 0 {
			t.Fatalf("URL %q should be hidden: %+v", invalid, links)
		}
	}
	t.Setenv("UNYCLOUD_GIT_URL", "http://example.org/git")
	t.Setenv("UNYCLOUD_GIT_LABEL", "Source")
	if links := runtimeFooterLinks(); len(links) != 1 || links[0].Label != "Source" {
		t.Fatalf("unexpected Git override: %+v", links)
	}
}
