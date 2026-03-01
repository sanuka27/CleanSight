import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Clock, Image, MapPin, Navigation } from "lucide-react";
import { STATUS_CONFIG, URGENCY_CONFIG } from "@/constants/mapUi";
import { timeAgo, formatCoords } from "@/utils/mapSelection";
import { fromGeoJSONPoint } from "@/utils/geo";
import type { MapReportMarker } from "@/types/map";

interface ReportListItemProps {
  report: MapReportMarker;
  isSelected: boolean;
  onClick: () => void;
  onRouteClick?: () => void;
  showRoute?: boolean;
}

export function ReportListItem({
  report,
  isSelected,
  onClick,
  onRouteClick,
  showRoute = false,
}: ReportListItemProps) {
  const statusCfg = STATUS_CONFIG[report.status];
  const urgencyCfg = URGENCY_CONFIG[report.urgency] ?? URGENCY_CONFIG.low;
  const { lat, lng } = fromGeoJSONPoint(report.location);

  return (
    <motion.div
      data-report-id={report._id}
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      onClick={onClick}
      className={`
        relative p-3 rounded-2xl border cursor-pointer group
        transition-colors duration-200 overflow-hidden
        ${
          isSelected
            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-lg shadow-emerald-100/50 ring-1 ring-emerald-200/60"
            : "bg-white/70 backdrop-blur-sm border-white/60 hover:bg-white hover:border-gray-200"
        }
      `}
    >
      {/* Selection indicator bar */}
      {isSelected && (
        <motion.div
          layoutId="report-selection-bar"
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-emerald-400 to-teal-500"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        {report.imageUrl ? (
          <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-black/5">
            <img
              src={report.imageUrl}
              alt="Report"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0 ring-1 ring-black/5">
            <Image className="w-5 h-5 text-gray-300" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyCfg.dotColor} ${
                  report.urgency === "high" ? "animate-pulse" : ""
                }`}
              />
              <span className="font-semibold text-sm capitalize truncate text-gray-800">
                {report.wasteType}
              </span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] h-5 px-2 flex-shrink-0 rounded-full font-medium ${statusCfg.badgeClass}`}
            >
              {statusCfg.label}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground/80 line-clamp-1 mb-1.5">
            {report.description || "No description provided"}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(report.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {formatCoords(lat, lng)}
            </span>
            {showRoute && onRouteClick && (
              <button
                className="ml-auto flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onRouteClick();
                }}
              >
                <Navigation className="w-3 h-3" />
                Route
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
