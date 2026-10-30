const CACHE_NAME = "unycloud-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const assetsURL = new URL("static/assets/", self.registration.scope);
  if (
    event.request.mode === "navigate" ||
    url.origin !== assetsURL.origin ||
    !url.pathname.startsWith(assetsURL.pathname)
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {}),
          );
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || Response.error()),
  );
});
