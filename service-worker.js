const CACHE_NAME = "blue-dodge-v6";
const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&display=swap";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon_512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      // Met aussi en cache la police (CSS + fichiers de police réels qu'elle référence)
      try {
        const cssResponse = await fetch(FONT_CSS_URL);
        await cache.put(FONT_CSS_URL, cssResponse.clone());
        const cssText = await cssResponse.text();
        const fontUrls = [...cssText.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/["']/g, ""));
        await Promise.all(
          fontUrls.map(async (url) => {
            try {
              const resp = await fetch(url);
              await cache.put(url, resp);
            } catch (e) { /* police non critique, on ignore si ça échoue */ }
          })
        );
      } catch (e) { /* pas grave si hors ligne dès la première installation */ }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
