package fbhttp

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/filebrowser/filebrowser/v2/settings"
)

func TestManifestPreservesLegacyThemeColors(t *testing.T) {
	t.Setenv("UNYCLOUD_THEME", "")
	for _, theme := range []string{"light", "dark"} {
		w := httptest.NewRecorder()
		d := &data{settings: &settings.Settings{}, server: &settings.Server{}}
		d.settings.Branding.Theme = theme
		if _, err := handleManifest(w, d); err != nil {
			t.Fatal(err)
		}
		var manifest map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &manifest); err != nil {
			t.Fatal(err)
		}
		want := "#5a52c8"
		if theme == "dark" {
			want = "#151329"
		}
		if manifest["theme_color"] != want {
			t.Fatalf("theme %s: manifest color %v, want %s", theme, manifest["theme_color"], want)
		}
		if manifest["name"] != "UnyCloud" || manifest["short_name"] != "UnyCloud" || manifest["display"] != "standalone" {
			t.Fatal("PWA identity or display mode changed")
		}
		if theme == "dark" && manifest["background_color"] != "#0f1117" {
			t.Fatal("dark PWA launch background changed")
		}
	}
}

func TestInitialHTMLLanguage(t *testing.T) {
	for input, want := range map[string]string{"fr-FR,fr;q=0.9,en;q=0.8": "fr-FR", "en;q=0.5,de;q=0.9": "de", "": "en", "<bad>": "en"} {
		if got := initialHTMLLanguage(input); got != want {
			t.Errorf("initialHTMLLanguage(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestMobileThemeColors(t *testing.T) {
	for _, theme := range []string{"light", "dark"} {
		color, background := runtimeThemeColors(theme)
		if color != "#3e3aab" {
			t.Errorf("theme %s: color %s", theme, color)
		}
		if theme == "dark" && background != "#0f1117" {
			t.Errorf("dark PWA background changed: %s", background)
		}
	}
}
