import { useState } from "react";
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
  onStatusFilter: (v: string) => void;
  onWasteTypeFilter: (v: string) => void;
  onUrgencyFilter: (v: string) => void;
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

export function ReportsTable({
  reports, loading, total, page, pageSize,
  onPageChange, onView,
  sortBy, sortOrder, onSort,
  statusFilter, wasteTypeFilter, urgencyFilter,
  onStatusFilter, onWasteTypeFilter, onUrgencyFilter,
}: ReportsTableProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
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

        <span className="ml-auto text-xs text-muted-foreground self-center">
          {total.toLocaleString()} reports
        </span>
      </div>

      {/* Table */}
      <div className="border border-border/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[35%]">
                  Report
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Status
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
                  <td colSpan={6} className="text-center py-16">
                    <div className="inline-block w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                    No reports found
                  </td>
                </tr>
              )}
              {!loading && reports.map((report) => (
                <tr
                  key={report._id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onView(report)}
                >
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
