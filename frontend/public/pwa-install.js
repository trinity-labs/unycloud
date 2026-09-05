// Auto-install prompt (mobile & desktop)
let promptDisplayed = false;

window.addEventListener("beforeinstallprompt", (e) => {
  if (promptDisplayed) return;
  promptDisplayed = true;

  e.preventDefault();

  setTimeout(() => {
    e.prompt();
    e.userChoice.catch(() => {});
  }, 5000);
});
