/**
 * pwaRegistration.ts — Service Worker registration + lifecycle management
 *
 * Registers /sw.js at root scope.  Exposes:
 *  - `initPWA()`          Call once from main.tsx after React mounts.
 *  - `onUpdateAvailable(cb)` Register a callback that fires when a new SW
 *                            version is waiting; the CB receives an
 *                            `applyUpdate()` function the user can invoke.
 *  - `registerSyncTag()`  Register the Background Sync tag when the user
 *                          goes offline, so the SW can notify clients when
 *                          connectivity returns.
 *
 * No build-time dependencies (no Workbox).
 */

type UpdateCallback = (applyUpdate: () => void) => void;

const _updateCallbacks: UpdateCallback[] = [];
let _waitingWorker: ServiceWorker | null = null;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Register a listener that is called whenever a new service worker version
 * is waiting to activate.  The callback receives an `applyUpdate` function
 * that the UI can call to skip-wait and reload.
 */
export function onUpdateAvailable(cb: UpdateCallback): () => void {
  _updateCallbacks.push(cb);
  // If a waiting worker was already detected before the listener was added,
  // fire immediately.
  if (_waitingWorker) {
    cb(() => applyUpdate());
  }
  return () => {
    const idx = _updateCallbacks.indexOf(cb);
    if (idx !== -1) _updateCallbacks.splice(idx, 1);
  };
}

/**
 * Initialise the PWA service worker.  Safe to call multiple times.
 * Should be called from main.tsx after the React tree mounts.
 */
export function initPWA(): void {
  if (!("serviceWorker" in navigator)) return;

  // Register on load so we don't block the first paint
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(handleRegistration)
      .catch((err) => {
        console.error("[PWA] Service worker registration failed:", err);
      });
  });

  // Listen for controller changes (new SW took over) → reload the page so
  // the user gets the freshest assets.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });

  // Listen for messages from the SW (e.g. SYNC_QUEUED_REPORTS)
  navigator.serviceWorker.addEventListener("message", handleSWMessage);
}

/**
 * Request a Background Sync tag so the SW fires 'cleansight-report-sync'
 * when connectivity is restored.  Safely degrades if the API is unsupported.
 */
export async function registerSyncTag(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // Background Sync API
    if ("sync" in reg) {
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(
        "cleansight-report-sync"
      );
    }
  } catch {
    // Silently ignore — JS-side 'online' event is the fallback
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────

function handleRegistration(reg: ServiceWorkerRegistration): void {
  // If there is already a waiting worker, fire immediately
  if (reg.waiting) {
    _waitingWorker = reg.waiting;
    notifyUpdateListeners();
  }

  // Listen for future updates
  reg.addEventListener("updatefound", () => {
    const newWorker = reg.installing;
    if (!newWorker) return;

    newWorker.addEventListener("statechange", () => {
      if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
        // A new version is ready but old version is still controlling the page
        _waitingWorker = newWorker;
        notifyUpdateListeners();
      }
    });
  });

  // Periodically check for updates (every 60 minutes)
  setInterval(() => reg.update(), 60 * 60 * 1000);
}

function notifyUpdateListeners(): void {
  _updateCallbacks.forEach((cb) => cb(() => applyUpdate()));
}

function applyUpdate(): void {
  if (_waitingWorker) {
    _waitingWorker.postMessage({ type: "SKIP_WAITING" });
    _waitingWorker = null;
  }
}

// Dispatched from within the app so external modules can subscribe
const SYNC_EVENT_NAME = "cleansight:sync-queue" as const;

function handleSWMessage(event: MessageEvent): void {
  if (!event.data) return;
  if (event.data.type === "SYNC_QUEUED_REPORTS") {
    // Dispatch a custom DOM event so the useOfflineQueue hook can pick it up
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
  }
}

export { SYNC_EVENT_NAME };
