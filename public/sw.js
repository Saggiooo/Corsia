/**
 * Service worker di Corsia.
 *
 * Dentro il supermercato il segnale e' scarso: le pagine gia' viste devono
 * restare aperte anche senza rete. Strategia:
 *  - asset statici: cache-first (sono immutabili, hanno l'hash nel nome)
 *  - navigazioni e payload RSC: network-first con fallback alla copia in cache
 *  - richieste non GET (le Server Action): sempre rete, mai cache
 */

const VERSION = "corsia-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  const wantsPage =
    request.mode === "navigate" || request.headers.get("RSC") === "1" || url.pathname === "/api/search";

  if (!wantsPage) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(PAGES).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        if (request.mode === "navigate") {
          const home = await caches.match("/");
          if (home) return home;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }),
  );
});
