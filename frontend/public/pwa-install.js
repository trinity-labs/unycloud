// Auto-install prompt (mobile & desktop)
let promptDisplayed = false;
const pwaDismissCookie = "unycloud_pwa_install_dismissed=true";

function hasDismissedInstallPrompt() {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim() === pwaDismissCookie);
}

function rememberDismissedInstallPrompt() {
  document.cookie = `${pwaDismissCookie}; Max-Age=31536000; Path=/; SameSite=Strict; Secure`;
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
