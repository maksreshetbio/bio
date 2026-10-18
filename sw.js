
const CACHE = "olymbio-pwa-v4";
const CACHE_PREFIX = "olymbio-pwa-";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Не перехватываем запросы к другим сайтам.
  if (url.origin !== self.location.origin) return;

  const isHTML =
    request.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/bio/") ||
    url.pathname.endsWith("/bio");

  if (isHTML) {
    // Для страницы сначала пробуем получить актуальную версию из сети.
    event.respondWith(
      fetch(new Request(request, { cache: "no-cache" }))
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache =>
              cache.put("./index.html", copy)
            );
          }
          return response;
        })
        .catch(async () => {
          return (
            await caches.match(request) ||
            await caches.match("./index.html") ||
            Response.error()
          );
        })
    );
    return;
  }

  // Для остальных ресурсов используем кэш, обновляя его из сети.
  event.respondWith(
    caches.match(request).then(cached => {
      const networkRequest = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache =>
              cache.put(request, copy)
            );
          }
          return response;
        });

      return cached || networkRequest;
    })
  );
});
