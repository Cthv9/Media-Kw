const CACHE_NAME = "media-kw-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./service-worker.js",
  "./style/style.css",
  "./style/home.png",
  "./scripts/app.js",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
