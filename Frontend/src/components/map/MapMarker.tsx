import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { STATUS_CONFIG } from "@/constants/mapUi";
import type { ReportStatus } from "@/types/map";

interface ReportMapMarkerProps {
  status: ReportStatus;
  urgency: string;
  isSelected: boolean;
}

/**
 * Styled map marker with status-coloured ring and selected pulse effect.
 * Renders as a Framer Motion div for smooth transitions.
 */
export function ReportMapMarker({
  status,
  urgency,
  isSelected,
}: ReportMapMarkerProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="relative"
    >
      {/* Selected glow ring */}
      {isSelected && (
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.3, opacity: [0.6, 0.2, 0.6] }}
          transition={{
            scale: { type: "spring", stiffness: 300, damping: 20 },
            opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          className={`absolute inset-0 rounded-full ${cfg.dotColor} blur-md`}
        />
      )}

      {/* Outer status ring */}
      <div
        className={`
          relative flex items-center justify-center
          transition-all duration-300 ease-out
          ${isSelected ? "scale-125" : "scale-100 hover:scale-110"}
        `}
      >
        {/* Ring background */}
        <div
          className={`
            absolute -inset-1.5 rounded-full border-2 transition-all duration-200
            ${
              isSelected
                ? `${cfg.borderColor} ${cfg.glowColor} shadow-lg`
                : `border-transparent`
            }
          `}
        />

        {/* Pin icon */}
        <MapPin
          className={`
            w-8 h-8 drop-shadow-md cursor-pointer
            transition-all duration-200
            ${cfg.markerColor}
            ${isSelected ? "drop-shadow-xl" : ""}
          `}
        />

        {/* High urgency pulse dot */}
        {urgency === "high" && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 ring-2 ring-white" />
          </span>
        )}
      </div>
    </motion.div>
  );
}
