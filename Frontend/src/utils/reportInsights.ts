/* ------------------------------------------------------------------ */
/*  Pure computation helpers for citizen dashboard insights            */
/*  All calculations derive from real report data — zero mock values   */
/* ------------------------------------------------------------------ */

import type { DashboardReport } from "@/types/dashboard";
import { WASTE_TYPE_LABELS } from "@/utils/reportStatus";

/* ── Resolution rate ─────────────────────────────────────────────── */

export function computeResolutionRate(
  totals: { total: number; resolved: number }
): number {
  if (totals.total === 0) return 0;
  return Math.round((totals.resolved / totals.total) * 100);
}

/* ── Average age of open (non-resolved) reports in hours ─────────── */

export function computeAvgOpenAge(reports: DashboardReport[]): number | null {
  const now = Date.now();
  const openReports = reports.filter(
    (r) => r.status === "pending" || r.status === "assigned"
  );
  if (openReports.length === 0) return null;

  const totalMs = openReports.reduce(
    (sum, r) => sum + (now - new Date(r.createdAt).getTime()),
    0
  );
  return totalMs / openReports.length / 3_600_000; // → hours
}

/**
 * Format hours into a human-readable duration string.
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

/* ── Most common waste type ──────────────────────────────────────── */

export function computeMostCommonWasteType(
  reports: DashboardReport[]
): { type: string; label: string; count: number } | null {
  if (reports.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const r of reports) {
    const wt = r.wasteType || "general";
    counts[wt] = (counts[wt] || 0) + 1;
  }

  let maxType = "";
  let maxCount = 0;
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxType = type;
      maxCount = count;
    }
  }

  return {
    type: maxType,
    label: WASTE_TYPE_LABELS[maxType] || maxType,
    count: maxCount,
  };
}

/* ── Latest status update ────────────────────────────────────────── */

export interface LatestUpdate {
  reportId: string;
  title: string;
  status: string;
  timeAgo: string;
  updatedAt: string;
}

export function computeLatestUpdate(
  reports: DashboardReport[]
): LatestUpdate | null {
  if (reports.length === 0) return null;

  // Find the most recently updated report
  const sorted = [...reports].sort((a, b) => {
    const da = new Date(a.updatedAt || a.createdAt).getTime();
    const db = new Date(b.updatedAt || b.createdAt).getTime();
    return db - da;
  });

  const latest = sorted[0];
  const dateStr = latest.updatedAt || latest.createdAt;

  return {
    reportId: latest._id,
    title: latest.title || latest.description?.slice(0, 40) || "Untitled",
    status: latest.status,
    timeAgo: getTimeAgo(dateStr),
    updatedAt: dateStr,
  };
}

/* ── Waste type distribution (for all reports) ───────────────────── */

export interface WasteDistribution {
  type: string;
  label: string;
  count: number;
  percentage: number;
}

export function computeWasteDistribution(
  reports: DashboardReport[]
): WasteDistribution[] {
  if (reports.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const r of reports) {
    const wt = r.wasteType || "general";
    counts[wt] = (counts[wt] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      label: WASTE_TYPE_LABELS[type] || type,
      count,
      percentage: Math.round((count / reports.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/* ── Time ago helper ─────────────────────────────────────────────── */

export function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
