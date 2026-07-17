/**
 * PendingQueueBadge.tsx — count badge for pending offline reports
 *
 * Renders a small animated counter badge. Designed to be overlaid on top of
 * the "Report Waste" icon in the Navbar.
 *
 * - Animates in/out with scale spring
 * - Colour: destructive red with pulse ring when count > 0
 * - Clamps display at "9+" for large counts
 */
import { motion, AnimatePresence } from "framer-motion";

interface PendingQueueBadgeProps {
  count: number;
  className?: string;
}

export function PendingQueueBadge({ count, className = "" }: PendingQueueBadgeProps) {
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);

  return (
    <AnimatePresence>
      <motion.span
        key="badge"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        aria-label={`${count} pending report${count > 1 ? "s" : ""} awaiting sync`}
        className={`
          absolute -top-1.5 -right-1.5
          min-w-[18px] h-[18px]
          flex items-center justify-center
          rounded-full
          bg-destructive text-destructive-foreground
          text-[10px] font-bold leading-none
          ring-2 ring-background
          ${className}
        `}
      >
        {/* Pulse ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-40"
        />
        <span className="relative z-10">{label}</span>
      </motion.span>
    </AnimatePresence>
  );
}
