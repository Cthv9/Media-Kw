// Versiona il cache name per invalidare facilmente
const CACHE_NAME = "media-kw-v1";
const ASSETS = [
"/",
"/index.html",
"/style/style.css",
"/scripts/app.js",
"/manifest.webmanifest",
"/icons/icon-192.png",
"/icons/icon-512.png",
// Chart.js CDN: cache-first
"https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"
];


self.addEventListener("install", (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
);
});


self.addEventListener("activate", (event) => {
event.waitUntil(
caches.keys().then((keys) => Promise.all(
keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
))
);
});


self.addEventListener("fetch", (event) => {
const { request } = event;
// Navigazioni: fallback offline
if (request.mode === "navigate") {
event.respondWith(
fetch(request).catch(() => caches.match("/index.html"))
);
return;
}
// Cache-first per asset statici (incl. CDN Chart.js)
event.respondWith(
caches.match(request).then((cached) => cached || fetch(request))
);
});