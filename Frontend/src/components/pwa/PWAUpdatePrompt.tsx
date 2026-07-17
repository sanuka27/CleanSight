/**
 * PWAUpdatePrompt.tsx — "New version available" update notification
 *
 * Appears as a bottom-right toast-style card when a new service worker is
 * waiting. Gives the user explicit control to apply the update (which
 * triggers skip-waiting and a page reload).
 *
 * Usage: mount once at the App level; it self-manages via onUpdateAvailable().
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { onUpdateAvailable } from "@/lib/pwaRegistration";

export function PWAUpdatePrompt() {
  const [applyFn, setApplyFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = onUpdateAvailable((apply) => {
      setApplyFn(() => apply);
    });
    return unsubscribe;
  }, []);

  const dismiss = () => setApplyFn(null);
  const update = () => {
    applyFn?.();
    setApplyFn(null);
  };

  return (
    <AnimatePresence>
      {applyFn && (
        <motion.div
          key="pwa-update"
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          role="alertdialog"
          aria-labelledby="pwa-update-title"
          aria-describedby="pwa-update-desc"
          className="
            fixed bottom-6 right-4 z-[60]
            w-80 max-w-[calc(100vw-2rem)]
            glass-premium rounded-2xl shadow-2xl
            border border-primary/20
            p-4
            flex flex-col gap-3
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p
                  id="pwa-update-title"
                  className="text-sm font-semibold text-foreground"
                >
                  Update Available
                </p>
                <p
                  id="pwa-update-desc"
                  className="text-xs text-muted-foreground"
                >
                  A new version of CleanSight is ready.
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss update prompt"
              className="
                w-6 h-6 rounded-md flex items-center justify-center
                text-muted-foreground hover:text-foreground
                hover:bg-muted/50 transition-colors flex-shrink-0
              "
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action */}
          <button
            id="pwa-update-refresh-btn"
            onClick={update}
            className="
              w-full flex items-center justify-center gap-2
              px-4 py-2 rounded-xl
              gradient-primary text-white text-sm font-semibold
              shadow-glow hover:shadow-glow-lg
              transition-all hover:scale-[1.02] active:scale-[0.98]
            "
          >
            <RefreshCw className="w-4 h-4" />
            Refresh to Update
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
