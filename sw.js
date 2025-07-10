```javascript
// CreatorSync – sw.js (v1.0.0)
// --------------------------------------
// Service worker for offline caching and performance optimization
// Investor Note: Offline support enhances global accessibility, driving user retention
// --------------------------------------

self.addEventListener("install", event => {
  // Cache core assets for offline access
  event.waitUntil(
    caches.open("creatorsync-cache-v1").then(cache =>
      cache.addAll([
        "/",
        "/index.html",
        "/styles.css",
        "/script.js",
        "/calculateCommission.js",
        "/logo.png",
        "/favicon.ico",
        "https://js.stripe.com/v3/",
        "https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.4.0/purify.min.js"
      ])
    )
  );
  // ❖ Caches critical assets to ensure fast loads and offline functionality
});

self.addEventListener("fetch", event => {
  // Serve cached assets or fetch from network
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Fallback to cached index.html for offline navigation
        return caches.match("/index.html");
      });
    })
  );
  // ❖ Offline fallback improves UX in low-connectivity regions
});

self.addEventListener("activate", event => {
  // Clean up old caches
  const cacheWhitelist = ["creatorsync-cache-v1"];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  // ❖ Cache management ensures efficient storage, supporting scalability
});
```
