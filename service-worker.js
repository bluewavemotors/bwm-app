const CACHE_STATIC = "bwm-static-v2";
const CACHE_DYNAMIC = "bwm-dynamic-v2";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./logo.png"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// ACTIVATE (cleanup old cache)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
            .map(k => caches.delete(k))
      )
    )
  );
});

// FETCH (SMART STRATEGY)
self.addEventListener("fetch", event => {
  const req = event.request;

  // ✅ API → NETWORK FIRST
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

  // ✅ IMAGES → CACHE FIRST
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

  // ✅ DEFAULT → CACHE FIRST
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});