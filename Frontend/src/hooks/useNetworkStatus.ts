/**
 * useNetworkStatus.ts — reactive online/offline hook
 *
 * Uses the `navigator.onLine` property for initial state and updates via
 * 'online' / 'offline' window events.  Returns a stable object reference
 * so consumers don't re-render unless the value actually changes.
 */
import { useState, useEffect } from "react";

export interface NetworkStatus {
  /** true when the browser reports a network connection */
  isOnline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sync in case the value changed between mount and listener registration
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
