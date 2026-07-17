/**
 * OfflineStatusBar.tsx — animated global offline/sync status banner
 *
 * Slides down from the bottom of the screen in three states:
 *   • offline  — "You're offline. Your report will be submitted when you reconnect."
 *   • syncing  — "Syncing N pending report(s)…"
 *   • synced   — "All pending reports submitted! ✓" (auto-hides after 3 s)
 *
 * Mounts below the fixed Navbar (z-40 so it sits beneath modals/toasts).
 */
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import type { SyncStatus } from "@/hooks/useOfflineQueue";

interface OfflineStatusBarProps {
  pendingCount: number;
  isSyncing: boolean;
  syncStatus: SyncStatus;
}

type BarVariant = "offline" | "syncing" | "synced" | "error" | "hidden";

function resolveVariant(
  isOnline: boolean,
  isSyncing: boolean,
  syncStatus: SyncStatus,
  pendingCount: number
): BarVariant {
  if (!isOnline) return "offline";
  if (isSyncing) return "syncing";
  if (syncStatus === "synced") return "synced";
  if (syncStatus === "error" && pendingCount > 0) return "error";
  return "hidden";
}

const VARIANTS: Record<
  Exclude<BarVariant, "hidden">,
  {
    bg: string;
    border: string;
    text: string;
    Icon: React.ElementType;
    iconClass: string;
    message: (count: number) => string;
  }
> = {
  offline: {
    bg: "bg-amber-950/90",
    border: "border-amber-600/40",
    text: "text-amber-200",
    Icon: WifiOff,
    iconClass: "text-amber-400",
    message: (count) =>
      count > 0
        ? `You're offline. ${count} report${count > 1 ? "s" : ""} will be submitted when you reconnect.`
        : "You're offline. New reports will be queued and submitted when you reconnect.",
  },
  syncing: {
    bg: "bg-blue-950/90",
    border: "border-blue-500/40",
    text: "text-blue-200",
    Icon: RefreshCw,
    iconClass: "text-blue-400 animate-spin",
    message: (count) =>
      `Syncing ${count} pending report${count > 1 ? "s" : ""}…`,
  },
  synced: {
    bg: "bg-emerald-950/90",
    border: "border-emerald-500/40",
    text: "text-emerald-200",
    Icon: CheckCircle2,
    iconClass: "text-emerald-400",
    message: () => "All pending reports submitted successfully!",
  },
  error: {
    bg: "bg-red-950/90",
    border: "border-red-500/40",
    text: "text-red-200",
    Icon: AlertTriangle,
    iconClass: "text-red-400",
    message: (count) =>
      `${count} report${count > 1 ? "s" : ""} failed to sync. Will retry automatically.`,
  },
};

export function OfflineStatusBar({
  pendingCount,
  isSyncing,
  syncStatus,
}: OfflineStatusBarProps) {
  const { isOnline } = useNetworkStatus();
  const variant = resolveVariant(isOnline, isSyncing, syncStatus, pendingCount);
  const isVisible = variant !== "hidden";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={variant}
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          aria-live="polite"
          role="status"
          className={`
            fixed top-[72px] left-0 right-0 z-40
            flex items-center justify-center gap-2.5
            px-4 py-2.5
            border-b backdrop-blur-md text-sm font-medium
            ${VARIANTS[variant].bg}
            ${VARIANTS[variant].border}
            ${VARIANTS[variant].text}
          `}
        >
          {(() => {
            const { Icon, iconClass, message } = VARIANTS[variant];
            return (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${iconClass}`} />
                <span>{message(pendingCount)}</span>
              </>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
