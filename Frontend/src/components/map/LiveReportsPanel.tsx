import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Crosshair,
  AlertTriangle,
  X,
  Minimize2,
  MapPin,
  Info,
  SearchX,
  Filter,
} from "lucide-react";
import { ReportFilters } from "@/components/map/ReportFilters";
import { ReportListItem } from "@/components/map/ReportListItem";
import { LEGEND_ITEMS } from "@/constants/mapUi";
import type { StatusFilterValue, SortValue } from "@/constants/mapUi";
import type { MapReportMarker } from "@/types/map";

// ── Skeleton loader ──────────────────────────────────────────────

function ReportCardSkeleton() {
  return (
    <div className="p-3 rounded-2xl border border-white/40 bg-white/40 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-gray-200/60 flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="flex justify-between">
            <div className="h-3.5 w-24 bg-gray-200/60 rounded-full" />
            <div className="h-5 w-16 bg-gray-200/60 rounded-full" />
          </div>
          <div className="h-3 w-full bg-gray-200/60 rounded-full" />
          <div className="flex gap-3">
            <div className="h-3 w-14 bg-gray-200/60 rounded-full" />
            <div className="h-3 w-20 bg-gray-200/60 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────

interface LiveReportsPanelProps {
  reports: MapReportMarker[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  statusFilter: StatusFilterValue;
  searchQuery: string;
  sortBy: SortValue;
  statusCounts: Record<string, number>;
  role: string;
  onClose: () => void;
  onSelectReport: (report: MapReportMarker) => void;
  onStatusFilterChange: (status: StatusFilterValue) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortValue) => void;
  onFlyToMe: () => void;
  onReportIssue: () => void;
  onShowRoute?: (report: MapReportMarker) => void;
}

// ── Main Panel ───────────────────────────────────────────────────

export function LiveReportsPanel({
  reports,
  isLoading,
  error,
  selectedId,
  statusFilter,
  searchQuery,
  sortBy,
  statusCounts,
  role,
  onClose,
  onSelectReport,
  onStatusFilterChange,
  onSearchChange,
  onSortChange,
  onFlyToMe,
  onReportIssue,
  onShowRoute,
}: LiveReportsPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected report when it changes via map marker click
  useEffect(() => {
    if (selectedId && listRef.current) {
      const el = listRef.current.querySelector(`[data-report-id="${selectedId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedId]);

  const showRoute =
    role === "volunteer" || role === "staff" || role === "admin";

  return (
    <motion.div
      initial={{ x: -420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -420, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.8 }}
      style={{ willChange: "transform, opacity" }}
      className="
        absolute left-4 top-24 bottom-4 w-[400px]
        bg-white/80 backdrop-blur-xl
        rounded-3xl shadow-2xl shadow-black/10
        border border-white/60
        z-10 flex flex-col overflow-hidden
      "
    >
      {/* Gradient border glow (top) */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 opacity-80 rounded-t-3xl" />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-200/50">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-gray-900">
                  Live Reports
                </h2>
                {!isLoading && (
                  <motion.span
                    key={reports.length}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full
                               bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold shadow-sm"
                  >
                    {reports.length}
                  </motion.span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                Real-time waste monitoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-muted-foreground/60 hover:text-muted-foreground hover:bg-gray-100/80"
              onClick={onClose}
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Actions row ─────────────────────────────────────────── */}
      <div className="px-5 pb-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs rounded-xl bg-white/60 border-white/50 hover:bg-white hover:border-emerald-200 transition-all h-8"
          onClick={onFlyToMe}
        >
          <Crosshair className="w-3 h-3" />
          My location
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md
                     shadow-emerald-200/40 hover:shadow-lg hover:shadow-emerald-200/60 transition-all h-8 flex-1"
          onClick={onReportIssue}
        >
          <AlertTriangle className="w-3 h-3" />
          Report Issue
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="px-5 pb-3">
        <ReportFilters
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
          statusCounts={statusCounts}
        />
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      {/* ── Report List ─────────────────────────────────────────── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2
                   scrollbar-thin scrollbar-thumb-emerald-200/60 scrollbar-track-transparent"
      >
        {/* Loading skeletons */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <ReportCardSkeleton key={i} />
            ))}
          </motion.div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Failed to load reports
            </p>
            <p className="text-xs text-muted-foreground/60">{error}</p>
          </motion.div>
        )}

        {/* Empty states */}
        {!isLoading && !error && reports.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10"
          >
            {searchQuery.trim() ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <SearchX className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  No results for "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground/50">
                  Try adjusting your search or filters
                </p>
              </>
            ) : statusFilter !== "All" ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Filter className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  No {statusFilter} reports
                </p>
                <p className="text-xs text-muted-foreground/50">
                  Try selecting "All" to see every report
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <Info className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  No reports in this area
                </p>
                <p className="text-xs text-muted-foreground/50">
                  Zoom out or report a new issue!
                </p>
              </>
            )}
          </motion.div>
        )}

        {/* Report cards */}
        <AnimatePresence mode="popLayout">
          {!isLoading &&
            !error &&
            reports.map((report) => (
              <ReportListItem
                key={report._id}
                report={report}
                isSelected={selectedId === report._id}
                onClick={() => onSelectReport(report)}
                showRoute={showRoute}
                onRouteClick={
                  onShowRoute ? () => onShowRoute(report) : undefined
                }
              />
            ))}
        </AnimatePresence>
      </div>

      {/* ── Footer: Legend + CTA ────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pb-4 pt-3 border-t border-gray-100/80">
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/50 mb-3">
          {LEGEND_ITEMS.map((item) => (
            <span key={item.status} className="flex items-center gap-1">
              <MapPin className={`w-3 h-3 ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
