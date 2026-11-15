package fbhttp

import "testing"

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
