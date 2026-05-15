/* Daywave service worker — image-first caching strategy.
   Shell assets are pre-cached on install; Unsplash and brand images
   use cache-first so they work offline and load instantly on mobile. */

const SHELL_CACHE = "daywave-shell-v1";
const IMAGE_CACHE = "daywave-images-v1";
const KNOWN_CACHES = [SHELL_CACHE, IMAGE_CACHE];

// App shell routes to pre-cache (static export with trailingSlash)
const SHELL_ASSETS = [
  "/",
  "/trip/",
  "/explore/",
  "/vault/",
  "/chat/",
  "/packing/",
  "/memories/",
  "/brand/daywave-icon-512.png",
  "/brand/daywave-apple-icon.png",
  "/brand/daywave-wordmark-dark.png",
  "/brand/daywave-favicon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        // addAll failures (e.g. offline at install time) are non-fatal
        cache.addAll(SHELL_ASSETS).catch(() => {})
      )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("daywave-") && !KNOWN_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // ── Unsplash images → cache-first (unlimited TTL, mobile-safe) ────────────
  if (url.hostname === "images.unsplash.com") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ── Local images & brand assets → cache-first ─────────────────────────────
  if (
    request.destination === "image" ||
    url.pathname.startsWith("/brand/")
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ── Navigation (HTML pages) → network-first with shell fallback ───────────
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // ── Static assets (JS / CSS / fonts) → cache-first ────────────────────────
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Everything else (Supabase API, etc.) → plain network, no caching
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return an empty 503 so the caller can show a fallback
    return new Response(null, { status: 503, statusText: "Offline" });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(null, { status: 503, statusText: "Offline" });
  }
}
