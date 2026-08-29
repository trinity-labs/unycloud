function loading(button: string) {
  const el: HTMLButtonElement | null = document.querySelector(
    `#${button}-button > i`
  );

  if (el === undefined || el === null) {
    console.log("Error getting button " + button);
    return;
  }

  const icon = el.textContent?.trim() || "";

  if (icon == "autorenew" || icon == "done") {
    return;
  }

  el.dataset.icon = icon;

  setTimeout(() => {
    if (el) {
      el.classList.add("spin");
      el.textContent = "autorenew";
    }
  }, 100);
}

function done(button: string) {
  const el: HTMLButtonElement | null = document.querySelector(
    `#${button}-button > i`
  );

  if (el === undefined || el === null) {
    console.log("Error getting button " + button);
    return;
  }

  setTimeout(() => {
    if (el !== null) {
      el.classList.remove("spin");
      el.textContent = el?.dataset?.icon || "";
    }
  }, 100);
}

function success(button: string) {
  const el: HTMLButtonElement | null = document.querySelector(
    `#${button}-button > i`
  );

  if (el === undefined || el === null) {
    console.log("Error getting button " + button);
    return;
  }

  setTimeout(() => {
    if (el !== null) {
      el.classList.remove("spin");
      el.textContent = "done";
    }
    setTimeout(() => {
      setTimeout(() => {
        if (el !== null) {
          el.textContent = el?.dataset?.icon || "";
        }
      }, 100);
    }, 500);
  }, 100);
}

export default {
  loading,
  done,
  success,
};
