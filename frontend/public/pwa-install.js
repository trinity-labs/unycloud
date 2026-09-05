let promptDisplayed = false;

window.addEventListener("beforeinstallprompt", function (event) {
  if (promptDisplayed) {
    return;
  }

  promptDisplayed = true;
  event.preventDefault();

  window.setTimeout(function () {
    event.prompt();
    event.userChoice.catch(function () {});
  }, 100);
});

window.addEventListener("appinstalled", function () {
  promptDisplayed = true;
});
