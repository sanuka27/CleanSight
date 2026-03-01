import type { ReportStatus } from "@/types/map";

// ── Status color configuration ────────────────────────────────────

export const STATUS_CONFIG: Record<
  ReportStatus,
  {
    label: string;
    badgeClass: string;
    dotColor: string;
    markerColor: string;
    ringColor: string;
    glowColor: string;
    borderColor: string;
  }
> = {
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-50 text-amber-600 border-amber-200",
    dotColor: "bg-amber-400",
    markerColor: "text-amber-500",
    ringColor: "ring-amber-400/40",
    glowColor: "shadow-amber-400/30",
    borderColor: "border-amber-400",
  },
  assigned: {
    label: "Assigned",
    badgeClass: "bg-sky-50 text-sky-600 border-sky-200",
    dotColor: "bg-sky-400",
    markerColor: "text-sky-500",
    ringColor: "ring-sky-400/40",
    glowColor: "shadow-sky-400/30",
    borderColor: "border-sky-400",
  },
  resolved: {
    label: "Resolved",
    badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
    dotColor: "bg-emerald-400",
    markerColor: "text-emerald-500",
    ringColor: "ring-emerald-400/40",
    glowColor: "shadow-emerald-400/30",
    borderColor: "border-emerald-400",
  },
};

// ── Filter options ────────────────────────────────────────────────

export const STATUS_FILTERS = ["All", "pending", "assigned", "resolved"] as const;
export type StatusFilterValue = (typeof STATUS_FILTERS)[number];

// ── Sorting options ───────────────────────────────────────────────

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "urgency", label: "Priority" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

// ── Urgency config ────────────────────────────────────────────────

export const URGENCY_CONFIG: Record<string, { dotColor: string; order: number }> = {
  high: { dotColor: "bg-red-500", order: 0 },
  medium: { dotColor: "bg-amber-400", order: 1 },
  low: { dotColor: "bg-emerald-400", order: 2 },
};

// ── Legend items ───────────────────────────────────────────────────

export const LEGEND_ITEMS = [
  { status: "pending" as const, label: "Pending", color: "text-amber-500" },
  { status: "assigned" as const, label: "Assigned", color: "text-sky-500" },
  { status: "resolved" as const, label: "Resolved", color: "text-emerald-500" },
];
