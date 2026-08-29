window.FileBrowser = {
  AuthMethod: "json",
  BaseURL: "",
  CSS: false,
  Color: "",
  DisableExternal: false,
  DisableUsedPercentage: false,
  EnableExec: true,
  EnableThumbs: true,
  LogoutPage: "",
  LoginPage: true,
  Name: "",
  NoAuth: false,
  ReCaptcha: false,
  ResizePreview: true,
  Signup: false,
  StaticURL: "",
  Theme: "",
  TusSettings: { chunkSize: 10485760, retryCount: 5 },
  Version: "(untracked)",
};

window.__prependStaticUrl = function (url) {
  return window.FileBrowser.StaticURL + "/" + url.replace(/^\/+/, "");
};
