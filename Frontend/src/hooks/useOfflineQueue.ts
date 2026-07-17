/**
 * useOfflineQueue.ts — offline report queue state + sync orchestration
 *
 * Responsibilities:
 *  1. Read the IndexedDB queue on mount and whenever online status changes.
 *  2. Expose { queuedReports, pendingCount, isSyncing, syncNow } to consumers.
 *  3. Auto-trigger syncNow() when the browser comes back online (via both
 *     the 'online' window event and the SW's SYNC_QUEUED_REPORTS custom event).
 *  4. For each queued item: upload image to Firebase Storage → POST to API →
 *     dequeue. Failures increment the retry counter (max 5 before giving up).
 *
 * The hook is designed to be mounted once at the App level so all pages
 * share the same sync state without duplicating IDB reads.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "@/lib/firebase";
import { uploadImage } from "@/lib/upload";
import api from "@/lib/api";
import {
  listQueuedReports,
  dequeueReport,
  incrementRetry,
  bufferToFile,
  getQueueCount,
  MAX_RETRY_COUNT,
  type QueuedReport,
} from "@/lib/offlineQueue";
import { registerSyncTag, SYNC_EVENT_NAME } from "@/lib/pwaRegistration";
import { useNetworkStatus } from "./useNetworkStatus";

// ── Types ──────────────────────────────────────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface OfflineQueueState {
  /** Full list of queued report objects (latest IDB snapshot). */
  queuedReports: QueuedReport[];
  /** Convenience count — use for badge display. */
  pendingCount: number;
  /** Whether a sync pass is currently running. */
  isSyncing: boolean;
  /** High-level sync status for UI feedback. */
  syncStatus: SyncStatus;
  /** Manually trigger a sync pass (idempotent while already syncing). */
  syncNow: () => Promise<void>;
  /** Refresh the queue list from IDB (e.g. after enqueue in another hook). */
  refreshQueue: () => Promise<void>;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useOfflineQueue(): OfflineQueueState {
  const { isOnline } = useNetworkStatus();
  const [queuedReports, setQueuedReports] = useState<QueuedReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  // Prevent concurrent sync passes
  const syncInProgress = useRef(false);

  /** Reload the queue snapshot from IDB. */
  const refreshQueue = useCallback(async () => {
    try {
      const items = await listQueuedReports();
      setQueuedReports(items);
    } catch (err) {
      console.warn("[OfflineQueue] Failed to read IDB:", err);
    }
  }, []);

  /** Attempt to upload + submit every queued report in order. */
  const syncNow = useCallback(async () => {
    // Guard: don't start a new pass while one is running
    if (syncInProgress.current) return;
    if (!navigator.onLine) return;

    // Guard: nothing to sync
    const count = await getQueueCount().catch(() => 0);
    if (count === 0) return;

    syncInProgress.current = true;
    setIsSyncing(true);
    setSyncStatus("syncing");

    // Ensure user is still authenticated — if not, defer until next login
    const user = auth.currentUser;
    if (!user) {
      syncInProgress.current = false;
      setIsSyncing(false);
      setSyncStatus("idle");
      return;
    }

    try {
      const items = await listQueuedReports();
      let anySucceeded = false;

      for (const item of items) {
        // Skip permanently failed items
        if (item.retryCount >= MAX_RETRY_COUNT) continue;

        try {
          // Reconstruct File from ArrayBuffer
          const file = bufferToFile(item.imageBlob, item.imageName, item.imageMime);

          // 1. Upload image to Firebase Storage
          const imageUrl = await uploadImage(file);

          // 2. POST report metadata to backend
          await api.createReport({
            imageUrl,
            description: item.description,
            location: item.location,
            wasteType: item.wasteType,
            urgency: item.urgency,
          });

          // 3. Remove from queue on success
          await dequeueReport(item.id);
          anySucceeded = true;

          console.log("[OfflineQueue] Synced report:", item.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.warn("[OfflineQueue] Sync failed for", item.id, ":", msg);
          await incrementRetry(item.id, msg).catch(() => {/* non-fatal */});
        }
      }

      await refreshQueue();
      setSyncStatus(anySucceeded ? "synced" : "error");

      // Auto-reset to idle after 4 s
      setTimeout(() => setSyncStatus((s) => (s === "synced" ? "idle" : s)), 4000);
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [refreshQueue]);

  // ── Initial queue load ───────────────────────────────────────────────────
  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // ── Auto-sync when coming back online ───────────────────────────────────
  useEffect(() => {
    if (isOnline) {
      syncNow();
    } else {
      // Register a Background Sync tag so the SW can trigger a sync later
      registerSyncTag();
    }
  }, [isOnline, syncNow]);

  // ── Listen for SW-initiated sync events ─────────────────────────────────
  useEffect(() => {
    const handler = () => {
      syncNow();
    };
    window.addEventListener(SYNC_EVENT_NAME, handler);
    return () => window.removeEventListener(SYNC_EVENT_NAME, handler);
  }, [syncNow]);

  return {
    queuedReports,
    pendingCount: queuedReports.filter((r) => r.retryCount < MAX_RETRY_COUNT).length,
    isSyncing,
    syncStatus,
    syncNow,
    refreshQueue,
  };
}
