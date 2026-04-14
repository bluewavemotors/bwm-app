const CACHE_STATIC  = "bwm-static-v4";   // bumped version
const CACHE_DYNAMIC = "bwm-dynamic-v4";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./share.html",
  "./style.css",
  "./app.js",
  "./logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // API requests – Google Apps Script
  if (url.hostname === "script.google.com") {
    // GET: network first, fallback to cache
    if (req.method === "GET") {
      event.respondWith(
        fetch(req)
          .then(res => {
            const cloned = res.clone();
            caches.open(CACHE_DYNAMIC).then(cache => cache.put(req, cloned));
            return res;
          })
          .catch(() => caches.match(req))
      );
      return;
    }
    // POST (and others): network only – do NOT attempt to cache
    event.respondWith(fetch(req));
    return;
  }

  // Images: cache first
  if (req.destination === "image") {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(fetchRes => {
        const cloned = fetchRes.clone();
        caches.open(CACHE_DYNAMIC).then(cache => cache.put(req, cloned));
        return fetchRes;
      }))
    );
    return;
  }

  // Default: cache first, network fallback
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});