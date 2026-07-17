/**
 * PWAContext.tsx — app-wide offline queue context
 *
 * Mounts useOfflineQueue() once at the App level so that any component can
 * read pendingCount / syncStatus / syncNow without prop drilling.
 *
 * Usage:
 *   // In App.tsx — wrap children with <PWAProvider>
 *   // In any component — const { pendingCount } = usePWA();
 */
import { createContext, useContext, type ReactNode } from "react";
import { useOfflineQueue, type OfflineQueueState } from "@/hooks/useOfflineQueue";

type PWAContextValue = OfflineQueueState;

const PWAContext = createContext<PWAContextValue | null>(null);

export function PWAProvider({ children }: { children: ReactNode }) {
  const offlineQueue = useOfflineQueue();
  return (
    <PWAContext.Provider value={offlineQueue}>{children}</PWAContext.Provider>
  );
}

export function usePWA(): PWAContextValue {
  const ctx = useContext(PWAContext);
  if (!ctx) {
    throw new Error("usePWA must be used within a <PWAProvider>");
  }
  return ctx;
}
