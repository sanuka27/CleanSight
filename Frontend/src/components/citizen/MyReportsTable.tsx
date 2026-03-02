/* ------------------------------------------------------------------ */
/*  My Reports Table — enhanced list with filters, pagination,         */
/*  waste type filter, sort options, and row actions                    */
/* ------------------------------------------------------------------ */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  SortDesc,
  Image,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Filter,
  Inbox,
  ArrowUpRight,
  Eye,
  ChevronDown,
  Download,
} from "lucide-react";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import {
  getStatusConfig,
  WASTE_TYPE_LABELS,
  URGENCY_LABELS,
  getLatLng,
} from "@/utils/reportStatus";
import { exportReportsCsv } from "@/utils/exportCsv";
import type { DashboardReport } from "@/types/dashboard";
import { useNavigate } from "react-router-dom";

/* ── Types ───────────────────────────────────────────────────────── */

interface MyReportsTableProps {
  reports: DashboardReport[];
  isLoading: boolean;
  onViewDetails: (report: DashboardReport) => void;
  initialStatusFilter?: StatusFilter;
}

type SortOrder = "newest" | "oldest" | "recently-updated";
type StatusFilter = "all" | "pending" | "assigned" | "resolved";
type WasteTypeFilter = "all" | "general" | "recyclable" | "organic" | "construction" | "hazardous";

const PAGE_SIZE = 8;

const urgencyIcon: Record<string, React.ReactNode> = {
  high: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
  medium: <Clock className="w-3.5 h-3.5 text-warning" />,
  low: <CheckCircle2 className="w-3.5 h-3.5 text-success" />,
};

/* ── Main Component ──────────────────────────────────────────────── */

export function MyReportsTable({ reports, isLoading, onViewDetails, initialStatusFilter = "all" }: MyReportsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteTypeFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const navigate = useNavigate();

  const filteredReports = useMemo(() => {
    let result = [...reports];

    // Search filter (title + description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.wasteType?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Waste type filter
    if (wasteTypeFilter !== "all") {
      result = result.filter((r) => r.wasteType === wasteTypeFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === "recently-updated") {
        const da = new Date(a.updatedAt || a.createdAt).getTime();
        const db = new Date(b.updatedAt || b.createdAt).getTime();
        return db - da;
      }
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

    return result;
  }, [reports, searchQuery, statusFilter, wasteTypeFilter, sortOrder]);

  // Reset visible count when filters change
  const handleFilterChange = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
      setter(value);
      setVisibleCount(PAGE_SIZE);
    },
    []
  );

  const paginatedReports = filteredReports.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReports.length;

  const handleExportCsv = useCallback(() => {
    exportReportsCsv(filteredReports, `cleansight-reports-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filteredReports]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setWasteTypeFilter("all");
    setSortOrder("newest");
    setVisibleCount(PAGE_SIZE);
  }, []);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    wasteTypeFilter !== "all";

  return (
    <RevealOnScroll delay={0.2}>
      <div className="glass-premium rounded-2xl border border-white/10 overflow-hidden">
        {/* Header with controls */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-lg">My Reports</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full">
                {filteredReports.length} of {reports.length}
              </span>
              {reports.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCsv}
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) =>
                  handleFilterChange(setSearchQuery, e.target.value)
                }
                placeholder="Search by title or description…"
                className="pl-9 h-9 bg-muted/20 border-white/10 text-sm"
              />
            </div>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                handleFilterChange(setStatusFilter, v as StatusFilter)
              }
            >
              <SelectTrigger className="w-full sm:w-[140px] h-9 bg-muted/20 border-white/10 text-sm">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            {/* Waste type filter */}
            <Select
              value={wasteTypeFilter}
              onValueChange={(v) =>
                handleFilterChange(setWasteTypeFilter, v as WasteTypeFilter)
              }
            >
              <SelectTrigger className="w-full sm:w-[150px] h-9 bg-muted/20 border-white/10 text-sm">
                <SelectValue placeholder="Waste Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="recyclable">Recyclable</SelectItem>
                <SelectItem value="organic">Organic</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
                <SelectItem value="hazardous">Hazardous</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortOrder}
              onValueChange={(v) =>
                handleFilterChange(setSortOrder, v as SortOrder)
              }
            >
              <SelectTrigger className="w-full sm:w-[170px] h-9 bg-muted/20 border-white/10 text-sm">
                <SortDesc className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="recently-updated">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Report list */}
        <div className="border-t border-white/5">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-16 h-16 rounded-xl bg-muted/20 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted/20 rounded" />
                    <div className="h-3 w-full bg-muted/10 rounded" />
                    <div className="h-3 w-32 bg-muted/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <EmptyReports
              hasReports={reports.length > 0}
              hasFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              navigate={navigate}
            />
          ) : (
            <>
              <div className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {paginatedReports.map((report, i) => (
                    <ReportRow
                      key={report._id}
                      report={report}
                      index={i}
                      onViewDetails={() => onViewDetails(report)}
                      onViewOnMap={() => {
                        const loc = getLatLng(report.location);
                        if (loc) {
                          navigate(`/map?lat=${loc.lat}&lng=${loc.lng}&reportId=${report._id}`);
                        }
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="p-4 flex justify-center border-t border-white/5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="gap-2 border-white/10 hover:bg-primary/5"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load More ({filteredReports.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RevealOnScroll>
  );
}

/* ── Report Row ──────────────────────────────────────────────────── */

interface ReportRowProps {
  report: DashboardReport;
  index: number;
  onViewDetails: () => void;
  onViewOnMap: () => void;
}

function ReportRow({ report, index, onViewDetails, onViewOnMap }: ReportRowProps) {
  const statusConfig = getStatusConfig(report.status);
  const loc = getLatLng(report.location);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-primary/[0.03] transition-all duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
      onClick={onViewDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onViewDetails();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Image thumbnail */}
      {report.imageUrl ? (
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/10 group-hover:ring-primary/30 transition-all duration-200">
          <img
            src={report.imageUrl}
            alt="Report"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-muted/10 flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
          <Image className="w-5 h-5 text-muted-foreground/40" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`${statusConfig.badgeClass} text-[11px] font-medium px-2 py-0.5`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass} mr-1.5 inline-block`}
            />
            {statusConfig.label}
          </Badge>
          <Badge
            variant="outline"
            className="text-[11px] border-border/50 text-muted-foreground"
          >
            {WASTE_TYPE_LABELS[report.wasteType] || report.wasteType}
          </Badge>
          {report.urgency && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {urgencyIcon[report.urgency]}
              {URGENCY_LABELS[report.urgency] || report.urgency}
            </span>
          )}
        </div>

        {/* Title & Description */}
        {report.title && (
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {report.title}
          </p>
        )}
        <p className="text-sm text-foreground/80 truncate">
          {report.description || "No description provided"}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(report.createdAt)} at {formatTime(report.createdAt)}
          </span>
          {loc && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Actions — always visible on mobile, hover on desktop */}
      <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          title="View details"
        >
          <Eye className="w-4 h-4" />
        </Button>
        {loc && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onViewOnMap();
            }}
            title="View on map"
          >
            <MapPin className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Empty State ─────────────────────────────────────────────────── */

interface EmptyReportsProps {
  hasReports: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  navigate: ReturnType<typeof import("react-router-dom").useNavigate>;
}

function EmptyReports({
  hasReports,
  hasFilters,
  onClearFilters,
  navigate,
}: EmptyReportsProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 rounded-2xl bg-muted/10 mb-4">
          <Search className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h4 className="font-display font-semibold text-base mb-1">
          No matching reports
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Try adjusting your search or filter criteria.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="gap-1.5"
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
          <Inbox className="w-10 h-10 text-primary/40" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1 p-1.5 rounded-full bg-primary/10 border border-primary/20"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ArrowUpRight className="w-3 h-3 text-primary" />
        </motion.div>
      </div>
      <h4 className="font-display font-semibold text-lg mb-1">
        No reports yet
      </h4>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-5">
        Start making a difference by reporting waste in your area. Your reports
        help keep communities clean.
      </p>
      <Button
        onClick={() => navigate("/report")}
        className="gradient-primary text-white shadow-glow gap-2"
      >
        <FileText className="w-4 h-4" />
        Submit Your First Report
      </Button>
    </div>
  );
}
