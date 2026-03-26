import { memo, useCallback } from "react";
import type { MouseEvent } from "react";
import {
  MoreHorizontal,
  Eye,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminReport, ReportStatus, WasteType, UrgencyLevel } from "@/types/admin";
import { cn } from "@/lib/utils";

interface ReportsTableProps {
  reports: AdminReport[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onView: (r: AdminReport) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  // Filters
  statusFilter: string;
  wasteTypeFilter: string;
  urgencyFilter: string;
  aiReviewStatusFilter?: string;
  categoryReviewStatusFilter?: string;
  onStatusFilter: (v: string) => void;
  onWasteTypeFilter: (v: string) => void;
  onUrgencyFilter: (v: string) => void;
  onAiReviewStatusFilter?: (v: string) => void;
  onCategoryReviewStatusFilter?: (v: string) => void;
  // Selection
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

const STATUS_BADGE: Record<ReportStatus, string> = {
  pending:     "bg-amber-100 text-amber-700 border-amber-200",
  verified:    "bg-sky-100 text-sky-700 border-sky-200",
  assigned:    "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-violet-100 text-violet-700 border-violet-200",
  resolved:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected:    "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pending", verified: "Verified", assigned: "Assigned",
  in_progress: "In Progress", resolved: "Resolved", rejected: "Rejected",
};

const ML_STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  flagged: "bg-amber-100 text-amber-700 border-amber-200",
  manual_review: "bg-blue-100 text-blue-700 border-blue-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  overridden: "bg-pink-100 text-pink-700 border-pink-200",
};

const ML_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  flagged: "Flagged",
  manual_review: "Manual Review",
  rejected: "Rejected",
  overridden: "Overridden",
};

const CATEGORY_STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  auto_accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  flagged: "bg-amber-100 text-amber-700 border-amber-200",
  manual_review: "bg-blue-100 text-blue-700 border-blue-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  overridden: "bg-pink-100 text-pink-700 border-pink-200",
};

const CATEGORY_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  auto_accepted: "Auto Accepted",
  approved: "Approved",
  flagged: "Flagged",
  manual_review: "Manual Review",
  rejected: "Rejected",
  overridden: "Overridden",
};

const URGENCY_DOT: Record<UrgencyLevel, string> = {
  low: "bg-emerald-500", medium: "bg-amber-500", high: "bg-red-500",
};

const WASTE_COLORS: Record<WasteType, string> = {
  general: "text-slate-600", recyclable: "text-emerald-600",
  organic: "text-lime-600", construction: "text-amber-600", hazardous: "text-red-600",
};

function SortButton({ field, current, order, onClick }: { field: string; current: string; order: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
      <ArrowUpDown className={cn("w-3 h-3", current === field ? "opacity-100 text-primary" : "opacity-40")} />
    </button>
  );
}

// Memoised row to avoid re-rendering the entire table on checkbox toggle
const ReportRow = memo(function ReportRow({
  report,
  isSelected,
  onToggleSelect,
  onView,
}: {
  report: AdminReport;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (r: AdminReport) => void;
}) {
  const handleRowClick = useCallback(() => onView(report), [onView, report]);
  const handleCheckboxClick = useCallback(
    (e: MouseEvent) => { e.stopPropagation(); onToggleSelect(report._id); },
    [onToggleSelect, report._id]
  );
  const handleCheckboxChange = useCallback(
    () => onToggleSelect(report._id),
    [onToggleSelect, report._id]
  );

  return (
    <tr
      className={cn(
        "border-b border-border/40 last:border-0 transition-colors cursor-pointer",
        isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
      )}
      onClick={handleRowClick}
    >
      <td className="px-3 py-3" onClick={handleCheckboxClick}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          aria-label={`Select report ${report._id}`}
          className="translate-y-0.5"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {report.imageUrl && (
            <img
              src={report.imageUrl}
              alt=""
              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border/40"
            />
          )}
          <div className="min-w-0">
            <p className="font-medium truncate max-w-[200px]">
              {report.title || report.description.slice(0, 50)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {report.reporter?.name || report.firebaseUid.slice(0, 8) + "…"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className={cn("border font-medium text-xs", STATUS_BADGE[report.status])}>
          {STATUS_LABELS[report.status]}
        </Badge>
      </td>
      <td className="px-4 py-3">
        {report.aiReviewStatus ? (
          <Badge className={cn("border font-medium text-xs", ML_STATUS_BADGE[report.aiReviewStatus] || ML_STATUS_BADGE.pending)}>
            {ML_STATUS_LABELS[report.aiReviewStatus] || "Pending"}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={cn("capitalize text-xs font-medium", WASTE_COLORS[report.wasteType])}>
          {report.wasteType}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full", URGENCY_DOT[report.urgency])} />
          <span className="text-xs capitalize">{report.urgency}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(report.createdAt).toLocaleDateString("en-US", {
          month: "short", day: "numeric",
        })}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(report)}>
              <Eye className="w-3.5 h-3.5 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onView(report)}>
              <UserCheck className="w-3.5 h-3.5 mr-2" />
              Manage
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

export function ReportsTable({
  reports, loading, total, page, pageSize,
  onPageChange, onView,
  sortBy, sortOrder, onSort,
  statusFilter, wasteTypeFilter, urgencyFilter, aiReviewStatusFilter, categoryReviewStatusFilter,
  onStatusFilter, onWasteTypeFilter, onUrgencyFilter, onAiReviewStatusFilter, onCategoryReviewStatusFilter,
  selectedIds, onToggleSelect, onToggleSelectAll,
}: ReportsTableProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const allOnPageSelected =
    reports.length > 0 && reports.every((r) => selectedIds.has(r._id));
  const someOnPageSelected =
    reports.some((r) => selectedIds.has(r._id)) && !allOnPageSelected;

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter || "all"} onValueChange={(v) => onStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as ReportStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={wasteTypeFilter || "all"} onValueChange={(v) => onWasteTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Waste Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["general", "recyclable", "organic", "construction", "hazardous"].map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={urgencyFilter || "all"} onValueChange={(v) => onUrgencyFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        {onAiReviewStatusFilter && (
          <Select value={aiReviewStatusFilter || "all"} onValueChange={(v) => onAiReviewStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="ML Review Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ML Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="manual_review">Manual Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="overridden">Overridden</SelectItem>
            </SelectContent>
          </Select>
        )}

        {onCategoryReviewStatusFilter && (
          <Select value={categoryReviewStatusFilter || "all"} onValueChange={(v) => onCategoryReviewStatusFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Category Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Category Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="manual_review">Manual Review</SelectItem>
              <SelectItem value="auto_accepted">Auto Accepted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="overridden">Overridden</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto flex items-center gap-3">
          {selectedIds.size > 0 && (
            <span className="text-xs font-medium text-primary">
              {selectedIds.size} selected
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {total.toLocaleString()} reports
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60">
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={someOnPageSelected ? "indeterminate" : allOnPageSelected}
                    onCheckedChange={onToggleSelectAll}
                    aria-label="Select all on page"
                    className="translate-y-0.5"
                    disabled={reports.length === 0 || loading}
                  />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[35%]">
                  Report
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  ML Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Urgency
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    Date
                    <SortButton field="createdAt" current={sortBy} order={sortOrder} onClick={() => onSort("createdAt")} />
                  </span>
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="inline-block w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && reports.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                    No reports found
                  </td>
                </tr>
              )}
              {!loading && reports.map((report) => (
                <ReportRow
                  key={report._id}
                  report={report}
                  isSelected={selectedIds.has(report._id)}
                  onToggleSelect={onToggleSelect}
                  onView={onView}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">
            Page {page} of {pages} · {total.toLocaleString()} results
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > pages) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
