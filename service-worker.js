const CACHE_STATIC  = "bwm-static-v3";
const CACHE_DYNAMIC = "bwm-dynamic-v3";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./share.html",       // FIX: was missing — share links now work offline/cached
  "./style.css",
  "./app.js",
  "./logo.png"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // Activate new SW immediately
});

// ACTIVATE (cleanup old caches)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // Take control of all open tabs immediately
});

// FETCH (SMART STRATEGY)
self.addEventListener("fetch", event => {
  const req = event.request;

  // API → NETWORK FIRST (with cache fallback)
  if (req.url.includes("script.google.com")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          return caches.open(CACHE_DYNAMIC).then(cache => {
            cache.put(req, res.clone());
            return res;
          });
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // IMAGES → CACHE FIRST
  if (req.destination === "image") {
    event.respondWith(
      caches.match(req).then(res => {
        return res || fetch(req).then(fetchRes => {
          return caches.open(CACHE_DYNAMIC).then(cache => {
            cache.put(req, fetchRes.clone());
            return fetchRes;
          });
        });
      })
    );
    return;
  }

  // DEFAULT → CACHE FIRST, THEN NETWORK
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});