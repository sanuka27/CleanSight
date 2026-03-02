/* ------------------------------------------------------------------ */
/*  Insight Cards — real computed metrics from report data              */
/* ------------------------------------------------------------------ */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Clock,
  Recycle,
  Zap,
} from "lucide-react";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import {
  computeResolutionRate,
  computeAvgOpenAge,
  computeMostCommonWasteType,
  computeLatestUpdate,
  formatDuration,
} from "@/utils/reportInsights";
import { getStatusConfig } from "@/utils/reportStatus";
import type { DashboardReport } from "@/types/dashboard";

interface InsightCardsProps {
  totals: { total: number; pending: number; assigned: number; resolved: number };
  reports: DashboardReport[];
  isLoading: boolean;
  onReportClick?: (reportId: string) => void;
}

export function InsightCards({ totals, reports, isLoading, onReportClick }: InsightCardsProps) {
  const resolutionRate = useMemo(() => computeResolutionRate(totals), [totals]);
  const avgOpenAge = useMemo(() => computeAvgOpenAge(reports), [reports]);
  const commonType = useMemo(() => computeMostCommonWasteType(reports), [reports]);
  const latestUpdate = useMemo(() => computeLatestUpdate(reports), [reports]);

  // Hide if no data at all
  if (!isLoading && totals.total === 0) return null;

  const insights = [
    {
      key: "resolution",
      label: "Resolution Rate",
      value: `${resolutionRate}%`,
      subtext:
        totals.resolved > 0
          ? `${totals.resolved} of ${totals.total} resolved`
          : "No reports resolved yet",
      icon: TrendingUp,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      show: true,
    },
    {
      key: "avg-age",
      label: "Avg. Open Report Age",
      value: avgOpenAge !== null ? formatDuration(avgOpenAge) : "—",
      subtext:
        avgOpenAge !== null
          ? `Across ${reports.filter((r) => r.status !== "resolved").length} open reports`
          : "No open reports",
      icon: Clock,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      show: avgOpenAge !== null,
    },
    {
      key: "common-type",
      label: "Most Reported Type",
      value: commonType?.label ?? "—",
      subtext: commonType
        ? `${commonType.count} report${commonType.count !== 1 ? "s" : ""} (${Math.round((commonType.count / totals.total) * 100)}%)`
        : "No reports yet",
      icon: Recycle,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      show: commonType !== null,
    },
    {
      key: "latest",
      label: "Latest Update",
      value: latestUpdate
        ? `"${latestUpdate.title.length > 20 ? latestUpdate.title.slice(0, 20) + "…" : latestUpdate.title}"`
        : "—",
      subtext: latestUpdate
        ? `Moved to ${getStatusConfig(latestUpdate.status).label} ${latestUpdate.timeAgo}`
        : "No activity yet",
      icon: Zap,
      iconBg: "bg-info/10",
      iconColor: "text-info",
      show: latestUpdate !== null,
      clickable: !!latestUpdate,
      reportId: latestUpdate?.reportId,
    },
  ].filter((insight) => insight.show);

  if (insights.length === 0) return null;

  return (
    <RevealOnScroll delay={0.15}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
            whileHover={{ y: -2, scale: 1.01 }}
            onClick={
              insight.clickable && insight.reportId && onReportClick
                ? () => onReportClick(insight.reportId!)
                : undefined
            }
            className={`glass-premium rounded-xl border border-white/10 p-4 relative overflow-hidden group ${
              insight.clickable ? "cursor-pointer" : "cursor-default"
            }`}
          >
            {/* Loading skeleton */}
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-muted/20" />
                <div className="h-5 w-16 rounded bg-muted/20" />
                <div className="h-3 w-24 rounded bg-muted/10" />
              </div>
            ) : (
              <div className="relative space-y-2">
                <div className={`${insight.iconBg} ${insight.iconColor} p-2 rounded-lg w-fit`}>
                  <insight.icon className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold font-display tracking-tight truncate">
                  {insight.value}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {insight.label}
                </p>
                <p className="text-[11px] text-muted-foreground/60 truncate">
                  {insight.subtext}
                </p>
              </div>
            )}

            {/* Subtle gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </motion.div>
        ))}
      </div>
    </RevealOnScroll>
  );
}
