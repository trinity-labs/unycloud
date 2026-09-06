// Auto-install prompt (mobile & desktop)
let promptDisplayed = false;
const pwaDismissCookie = "unycloud_pwa_install_dismissed=true";
const iosPromptId = "unycloud-ios-install-prompt";

function hasDismissedInstallPrompt() {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim() === pwaDismissCookie);
}

function rememberDismissedInstallPrompt() {
  document.cookie = `${pwaDismissCookie}; Max-Age=31536000; Path=/; SameSite=Strict; Secure`;
}

function isIosDevice() {
  const platform = navigator.platform || "";
  const userAgent = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneApp() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function showIosInstallPrompt() {
  if (
    promptDisplayed ||
    hasDismissedInstallPrompt() ||
    !isIosDevice() ||
    isStandaloneApp() ||
    document.getElementById(iosPromptId)
  ) {
    return;
  }

  promptDisplayed = true;

  const overlay = document.createElement("div");
  overlay.id = iosPromptId;
  overlay.className = "pwa-ios-install";

  const dialog = document.createElement("div");
  dialog.className = "pwa-ios-install__dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", `${iosPromptId}-title`);

  const title = document.createElement("h2");
  title.id = `${iosPromptId}-title`;
  title.textContent = "Installer UnyCloud";

  const message = document.createElement("p");
  message.textContent =
    "Sur iPhone ou iPad, touchez Partager puis Ajouter a l'ecran d'accueil.";

  const actions = document.createElement("div");
  actions.className = "pwa-ios-install__actions";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "pwa-ios-install__button pwa-ios-install__button--secondary";
  close.textContent = "Plus tard";

  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = "pwa-ios-install__button pwa-ios-install__button--primary";
  confirm.textContent = "OK";

  const dismiss = () => {
    rememberDismissedInstallPrompt();
    overlay.remove();
  };

  close.addEventListener("click", dismiss);
  confirm.addEventListener("click", dismiss);

  actions.append(close, confirm);
  dialog.append(title, message, actions);
  overlay.append(dialog);
  document.body.append(overlay);
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();

  if (promptDisplayed || hasDismissedInstallPrompt()) return;
  promptDisplayed = true;

  setTimeout(() => {
    e.prompt();
    e.userChoice
      .then(({ outcome }) => {
        if (outcome === "dismissed") {
          rememberDismissedInstallPrompt();
        }
      })
      .catch(() => {});
  }, 5000);
});

window.addEventListener("load", () => {
  setTimeout(showIosInstallPrompt, 5000);
});
