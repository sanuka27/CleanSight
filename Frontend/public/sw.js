/**
 * CleanSight Service Worker — sw.js
 *
 * Strategy overview:
 *  - App shell + static assets  → Cache-first (versioned cache)
 *  - Firebase Storage URLs      → Cache-first (long TTL, content-addressed)
 *  - API calls (/api/*)         → Network-first with graceful offline fallback
 *  - Firebase Auth compat CDN   → Network-first (always fresh)
 *  - Navigation requests        → Cache-first with network fallback (SPA shell)
 *
 * Offline report submissions are queued in IndexedDB by the client page;
 * this SW handles the Background Sync 'cleansight-report-sync' tag to notify
 * the client that connectivity has been restored.
 */

const SW_VERSION = "v1.0.0";
const CACHE_STATIC = `cleansight-static-${SW_VERSION}`;
const CACHE_IMAGES = `cleansight-images-${SW_VERSION}`;
const KNOWN_CACHES = [CACHE_STATIC, CACHE_IMAGES];

/**
 * Assets to pre-cache during install (app shell).
 * Vite emits hashed bundles — we pre-cache the entry points only;
 * everything else is cached at runtime on first fetch.
 */
const PRECACHE_URLS = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

// ---------------------------------------------------------------------------
// INSTALL — pre-cache the app shell
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => {
        // Activate immediately without waiting for old tabs to close.
        return self.skipWaiting();
      })
      .catch((err) => {
        // Non-fatal: if a pre-cache URL is missing at install time (e.g. dev
        // mode without a build) we log but don't block activation.
        console.warn("[SW] Pre-cache partial failure:", err);
      })
  );
});

// ---------------------------------------------------------------------------
// ACTIVATE — clean up stale caches from previous SW versions
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !KNOWN_CACHES.includes(k))
            .map((k) => {
              console.log("[SW] Deleting stale cache:", k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// FETCH — route-based caching strategy
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests entirely
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith("http")) return;

  // ── API calls → network-first ──────────────────────────────────────────
  if (url.pathname.startsWith("/api/") || isBackendApiUrl(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Firebase Storage images → cache-first (content-addressed, long TTL) ─
  if (url.hostname.includes("firebasestorage.googleapis.com")) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // ── Firebase Auth / gstatic CDN → network-first ───────────────────────
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("firebaseapp.com")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── Navigation requests (HTML) → SPA shell fallback ───────────────────
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // ── Static assets (JS, CSS, images, fonts) → cache-first ──────────────
  event.respondWith(cacheFirst(request, CACHE_STATIC));
});

// ---------------------------------------------------------------------------
// BACKGROUND SYNC — notify clients to flush the offline queue
// ---------------------------------------------------------------------------
self.addEventListener("sync", (event) => {
  if (event.tag === "cleansight-report-sync") {
    event.waitUntil(notifyClientsToSync());
  }
});

// ---------------------------------------------------------------------------
// MESSAGE — handle commands from the app (e.g. SKIP_WAITING)
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CLIENTS_CLAIM":
      self.clients.claim();
      break;

    default:
      break;
  }
});

// ---------------------------------------------------------------------------
// Helper: is this request targeting our backend API?
// ---------------------------------------------------------------------------
function isBackendApiUrl(url) {
  // Covers production deployments where API is on a different origin
  return (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("render.com") ||
    url.hostname.includes("railway.app")
  );
}

// ---------------------------------------------------------------------------
// Strategy: cache-first
// ---------------------------------------------------------------------------
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status < 400) {
      // Clone before caching — body can only be read once
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return offline fallback if available
    return offlineFallback(request);
  }
}

// ---------------------------------------------------------------------------
// Strategy: network-first
// ---------------------------------------------------------------------------
async function networkFirst(request) {
  const cache = await caches.open(CACHE_STATIC);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

// ---------------------------------------------------------------------------
// Strategy: SPA navigation — try network, fall back to cached index.html
// ---------------------------------------------------------------------------
async function navigationHandler(request) {
  const cache = await caches.open(CACHE_STATIC);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return cached page shell or index.html so the SPA router can handle it
    const cached =
      (await cache.match(request)) || (await cache.match("/index.html"));
    if (cached) return cached;
    return offlineFallback(request);
  }
}

// ---------------------------------------------------------------------------
// Fallback for requests that cannot be served from cache or network
// ---------------------------------------------------------------------------
function offlineFallback(request) {
  if (request.mode === "navigate") {
    return caches
      .match("/index.html")
      .then((r) => r || new Response("Offline", { status: 503 }));
  }
  return new Response("Offline", {
    status: 503,
    headers: { "Content-Type": "text/plain" },
  });
}

// ---------------------------------------------------------------------------
// Post a SYNC_QUEUED_REPORTS message to all open client tabs
// ---------------------------------------------------------------------------
async function notifyClientsToSync() {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  clientList.forEach((client) => {
    client.postMessage({ type: "SYNC_QUEUED_REPORTS" });
  });
}
