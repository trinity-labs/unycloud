package fbhttp

import (
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	htmltemplate "html/template"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	texttemplate "text/template"

	"github.com/filebrowser/filebrowser/v2/auth"
	"github.com/filebrowser/filebrowser/v2/settings"
	"github.com/filebrowser/filebrowser/v2/storage"
	"github.com/filebrowser/filebrowser/v2/version"
)

func handleWithStaticData(w http.ResponseWriter, _ *http.Request, d *data, fSys fs.FS, file, contentType string) (int, error) {
	w.Header().Set("Content-Type", contentType)

	auther, err := d.store.Auth.Get(d.settings.AuthMethod)
	if err != nil {
		return http.StatusInternalServerError, err
	}

	data := map[string]interface{}{
		"Name":                  d.settings.Branding.Name,
		"DisableExternal":       d.settings.Branding.DisableExternal,
		"DisableUsedPercentage": d.settings.Branding.DisableUsedPercentage,
		"Color":                 d.settings.Branding.Color,
		"BaseURL":               d.server.BaseURL,
		"Version":               version.Version,
		"StaticURL":             path.Join(d.server.BaseURL, "/static"),
		"Signup":                d.settings.Signup,
		"NoAuth":                d.settings.AuthMethod == auth.MethodNoAuth,
		"AuthMethod":            d.settings.AuthMethod,
		"LogoutPage":            d.settings.LogoutPage,
		"LoginPage":             auther.LoginPage(),
		"CSS":                   false,
		"ReCaptcha":             false,
		"Theme":                 d.settings.Branding.Theme,
		"EnableThumbs":          d.server.EnableThumbnails,
		"ResizePreview":         d.server.ResizePreview,
		"EnableExec":            d.server.EnableExec,
		"TusSettings":           d.settings.Tus,
		"HideLoginButton":       d.settings.HideLoginButton,
	}

	if d.settings.Branding.Files != "" {
		fPath := filepath.Join(d.settings.Branding.Files, "custom.css")
		_, err := os.Stat(fPath)

		if err != nil && !os.IsNotExist(err) {
			log.Printf("couldn't load custom styles: %v", err)
		}

		if err == nil {
			data["CSS"] = true
		}
	}

	if d.settings.AuthMethod == auth.MethodJSONAuth {
		raw, err := d.store.Auth.Get(d.settings.AuthMethod)
		if err != nil {
			return http.StatusInternalServerError, err
		}

		auther := raw.(*auth.JSONAuth)

		if auther.ReCaptcha != nil {
			data["ReCaptcha"] = auther.ReCaptcha.Key != "" && auther.ReCaptcha.Secret != ""
			data["ReCaptchaHost"] = auther.ReCaptcha.Host
			data["ReCaptchaKey"] = auther.ReCaptcha.Key
		}
	}

	b, err := json.Marshal(data)
	if err != nil {
		return http.StatusInternalServerError, err
	}

	data["Json"] = htmltemplate.JS(strings.ReplaceAll(string(b), `'`, `\'`))

	fileContents, err := fs.ReadFile(fSys, file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return http.StatusNotFound, err
		}
		return http.StatusInternalServerError, err
	}
	if strings.HasPrefix(contentType, "application/javascript") {
		tpl := texttemplate.Must(texttemplate.New(file).Delims("[{[", "]}]").Parse(string(fileContents)))
		err = tpl.Execute(w, data)
	} else {
		tpl := htmltemplate.Must(htmltemplate.New(file).Delims("[{[", "]}]").Parse(string(fileContents)))
		err = tpl.Execute(w, data)
	}
	if err != nil {
		return http.StatusInternalServerError, err
	}

	return 0, nil
}

func getStaticHandlers(store *storage.Storage, server *settings.Server, assetsFs fs.FS) (index, static http.Handler) {
	index = handle(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		if r.Method != http.MethodGet {
			return http.StatusNotFound, nil
		}

		w.Header().Set("x-xss-protection", "1; mode=block")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		return handleWithStaticData(w, r, d, assetsFs, "public/index.html", "text/html; charset=utf-8")
	}, "", store, server)

	static = handle(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		if r.Method != http.MethodGet {
			return http.StatusNotFound, nil
		}

		if strings.HasSuffix(r.URL.Path, "/") {
			return http.StatusNotFound, nil
		}

		const maxAge = 86400 // 1 day
		w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%v", maxAge))
		w.Header().Set("X-Content-Type-Options", "nosniff")

		if r.URL.Path == "runtime.js" {
			w.Header().Set("Cache-Control", "no-store")
			return handleWithStaticData(w, r, d, assetsFs, "runtime.js", "application/javascript; charset=utf-8")
		}

		if r.URL.Path == "manifest.json" {
			w.Header().Set("Cache-Control", "no-store")
			return handleManifest(w, d)
		}

		if d.settings.Branding.Files != "" {
			if strings.HasPrefix(r.URL.Path, "img/") {
				fPath := filepath.Join(d.settings.Branding.Files, r.URL.Path)
				_, err := os.Stat(fPath)
				if err != nil && !os.IsNotExist(err) {
					log.Printf("could not load branding file override: %v", err)
				} else if err == nil {
					http.ServeFile(w, r, fPath)
					return 0, nil
				}
			} else if r.URL.Path == "custom.css" && d.settings.Branding.Files != "" {
				w.Header().Set("Cache-Control", "no-store")
				http.ServeFile(w, r, filepath.Join(d.settings.Branding.Files, "custom.css"))
				return 0, nil
			}
		}

		if !strings.HasSuffix(r.URL.Path, ".js") {
			http.FileServer(http.FS(assetsFs)).ServeHTTP(w, r)
			return 0, nil
		}

		f, err := assetsFs.Open(r.URL.Path + ".gz")
		if err != nil {
			return http.StatusNotFound, err
		}
		defer f.Close()

		acceptEncoding := r.Header.Get("Accept-Encoding")
		if strings.Contains(acceptEncoding, "gzip") {
			w.Header().Set("Content-Encoding", "gzip")
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")

			if _, err := io.Copy(w, f); err != nil {
				return http.StatusInternalServerError, err
			}
		} else {
			gzReader, err := gzip.NewReader(f)
			if err != nil {
				return http.StatusInternalServerError, err
			}
			defer gzReader.Close()

			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")

			if _, err := io.Copy(w, gzReader); err != nil {
				return http.StatusInternalServerError, err
			}
		}

		return 0, nil
	}, "/static/", store, server)

	return index, static
}

func customStylesheetHandler(store *storage.Storage, server *settings.Server) http.Handler {
	return handle(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		if r.Method != http.MethodGet {
			return http.StatusNotFound, nil
		}

		if d.settings.Branding.Files == "" {
			return http.StatusNotFound, nil
		}

		fPath := filepath.Join(d.settings.Branding.Files, "custom.css")
		if _, err := os.Stat(fPath); err != nil {
			if !os.IsNotExist(err) {
				log.Printf("could not load custom stylesheet: %v", err)
			}
			return http.StatusNotFound, nil
		}

		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		http.ServeFile(w, r, fPath)
		return 0, nil
	}, "", store, server)
}

func handleManifest(w http.ResponseWriter, d *data) (int, error) {
	name := d.settings.Branding.Name
	if name == "" {
		name = "UnyCloud"
	}

	themeColor := d.settings.Branding.Color
	if themeColor == "" {
		themeColor = "#5a52c8"
	}

	startURL := d.server.BaseURL
	if startURL == "" {
		startURL = "/"
	}

	staticURL := path.Join(d.server.BaseURL, "/static")
	manifest := map[string]interface{}{
		"name":       name,
		"short_name": name,
		"icons": []map[string]string{
			{
				"src":   path.Join(staticURL, "/img/icons/android-chrome-192x192.png"),
				"sizes": "192x192",
				"type":  "image/png",
			},
			{
				"src":   path.Join(staticURL, "/img/icons/android-chrome-512x512.png"),
				"sizes": "512x512",
				"type":  "image/png",
			},
		},
		"start_url":        startURL,
		"display":          "standalone",
		"background_color": "#ffffff",
		"theme_color":      themeColor,
	}

	body, err := json.Marshal(manifest)
	if err != nil {
		return http.StatusInternalServerError, err
	}

	w.Header().Set("Content-Type", "application/manifest+json; charset=utf-8")
	if _, err := w.Write(body); err != nil {
		return http.StatusInternalServerError, err
	}

	return 0, nil
}
