/**
 * PWAStatusOverlay.tsx — connects the PWA context to OfflineStatusBar
 *
 * This thin wrapper reads from PWAContext (so the queue is instantiated once)
 * and passes the relevant props to OfflineStatusBar.
 * Keeping it separate avoids importing the context in the generic status bar.
 */
import { usePWA } from "@/context/PWAContext";
import { OfflineStatusBar } from "./OfflineStatusBar";

export function PWAStatusOverlay() {
  const { pendingCount, isSyncing, syncStatus } = usePWA();

  return (
    <OfflineStatusBar
      pendingCount={pendingCount}
      isSyncing={isSyncing}
      syncStatus={syncStatus}
    />
  );
}
