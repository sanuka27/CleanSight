import { useState, useMemo } from "react";
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
  SortAsc,
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
} from "lucide-react";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { getStatusConfig, WASTE_TYPE_LABELS, URGENCY_LABELS } from "@/utils/reportStatus";
import type { DashboardReport } from "@/types/dashboard";
import { useNavigate } from "react-router-dom";

interface ReportsListProps {
  reports: DashboardReport[];
  isLoading: boolean;
}

const urgencyIcon: Record<string, React.ReactNode> = {
  high: <AlertCircle className="w-3.5 h-3.5 text-destructive" />,
  medium: <Clock className="w-3.5 h-3.5 text-warning" />,
  low: <CheckCircle2 className="w-3.5 h-3.5 text-success" />,
};

type SortOrder = "newest" | "oldest";
type StatusFilter = "all" | "pending" | "assigned" | "resolved";

export function ReportsList({ reports, isLoading }: ReportsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const navigate = useNavigate();

  const filteredReports = useMemo(() => {
    let result = [...reports];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.description?.toLowerCase().includes(q)) ||
          r.wasteType?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

    return result;
  }, [reports, searchQuery, statusFilter, sortOrder]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
            <span className="text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full">
              {filteredReports.length} of {reports.length}
            </span>
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports…"
                className="pl-9 h-9 bg-muted/20 border-white/10 text-sm"
              />
            </div>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
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

            {/* Sort toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))
              }
              className="h-9 gap-1.5 border-white/10 bg-muted/20 text-sm whitespace-nowrap"
            >
              {sortOrder === "newest" ? (
                <SortDesc className="w-3.5 h-3.5" />
              ) : (
                <SortAsc className="w-3.5 h-3.5" />
              )}
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </Button>
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
              hasFilters={searchQuery.trim() !== "" || statusFilter !== "all"}
              onClearFilters={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              navigate={navigate}
            />
          ) : (
            <div className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredReports.map((report, i) => (
                  <ReportCard
                    key={report._id}
                    report={report}
                    index={i}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    onView={() => {
                      // Navigate to the map centered on this report if location exists
                      if (report.location) {
                        navigate(`/map?lat=${report.location.lat}&lng=${report.location.lng}`);
                      }
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </RevealOnScroll>
  );
}

/* ── Report Card ────────────────────────────────────────────────── */

interface ReportCardProps {
  report: DashboardReport;
  index: number;
  formatDate: (d: string) => string;
  formatTime: (d: string) => string;
  onView: () => void;
}

function ReportCard({ report, index, formatDate, formatTime, onView }: ReportCardProps) {
  const statusConfig = getStatusConfig(report.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-primary/[0.02] transition-colors group"
    >
      {/* Image thumbnail */}
      {report.imageUrl ? (
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/10">
          <img
            src={report.imageUrl}
            alt="Report"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass} mr-1.5 inline-block`} />
            {statusConfig.label}
          </Badge>
          <Badge variant="outline" className="text-[11px] border-border/50 text-muted-foreground">
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
          <p className="text-sm font-medium text-foreground truncate">
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
          {report.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {report.location && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={onView}
            title="View on map"
          >
            <MapPin className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Empty State ────────────────────────────────────────────────── */

interface EmptyReportsProps {
  hasReports: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

function EmptyReports({ hasReports, hasFilters, onClearFilters, navigate }: EmptyReportsProps) {

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
        <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1.5">
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
        Start making a difference by reporting waste in your area. Your reports help keep communities clean.
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
