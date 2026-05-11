/* TripFlow Service Worker — offline-first caching */
const CACHE_VER = "v1";
const SHELL_CACHE  = `tripflow-shell-${CACHE_VER}`;
const IMAGE_CACHE  = `tripflow-images-${CACHE_VER}`;
const API_CACHE    = `tripflow-api-${CACHE_VER}`;

// Static Next.js app-shell paths to pre-cache at install time
const PRECACHE_URLS = ["/", "/trip", "/explore", "/vault", "/chat", "/packing"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.addAll(PRECACHE_URLS))
      .catch(() => { /* best-effort */ })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, IMAGE_CACHE, API_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET over HTTP(S)
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

  // Unsplash hero / thumbnail images — cache-first (long-lived)
  if (url.hostname === "images.unsplash.com") {
    event.respondWith(cacheFirst(IMAGE_CACHE, request));
    return;
  }

  // Supabase REST / realtime — stale-while-revalidate
  if (url.hostname.includes("supabase")) {
    event.respondWith(staleWhileRevalidate(API_CACHE, request));
    return;
  }

  // Next.js static assets — cache-first (hashed filenames, safe forever)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(SHELL_CACHE, request));
    return;
  }

  // Navigation (page loads) — network-first, fall back to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? caches.match("/") ?? new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // Everything else — network-first, cache on success
  event.respondWith(networkFirst(SHELL_CACHE, request));
});

// ── Strategy helpers ──────────────────────────────────────────────────────────

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  // Kick off revalidation in background; don't await it
  const revalidate = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) return cached;
  return (await revalidate) ?? new Response("Offline", { status: 503 });
}

async function networkFirst(cacheName, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response("Offline", { status: 503 });
  }
}
