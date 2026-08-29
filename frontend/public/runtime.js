window.FileBrowser = [{[ .Json ]}];

window.__prependStaticUrl = function (url) {
  return window.FileBrowser.StaticURL + "/" + url.replace(/^\/+/, "");
};
