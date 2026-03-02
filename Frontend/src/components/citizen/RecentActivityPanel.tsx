/* ------------------------------------------------------------------ */
/*  Recent Activity Panel — derived from real report data              */
/*  Clickable items open report details                                */
/* ------------------------------------------------------------------ */

import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRightCircle,
  Activity,
} from "lucide-react";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { getStatusConfig, WASTE_TYPE_LABELS } from "@/utils/reportStatus";
import { getTimeAgo } from "@/utils/reportInsights";
import type { DashboardReport } from "@/types/dashboard";

/* ── Types ───────────────────────────────────────────────────────── */

interface RecentActivityPanelProps {
  reports: DashboardReport[];
  onReportClick: (report: DashboardReport) => void;
  maxItems?: number;
}

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  assigned: <ArrowRightCircle className="w-3.5 h-3.5" />,
  resolved: <CheckCircle2 className="w-3.5 h-3.5" />,
};

/* ── Component ───────────────────────────────────────────────────── */

export function RecentActivityPanel({
  reports,
  onReportClick,
  maxItems = 8,
}: RecentActivityPanelProps) {
  // Build activity list from recently updated reports
  const activities = [...reports]
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    })
    .slice(0, maxItems)
    .map((report) => {
      const config = getStatusConfig(report.status);
      const activityDate = report.updatedAt || report.createdAt;
      return {
        report,
        status: report.status,
        config,
        wasteType: report.wasteType,
        wasteLabel: WASTE_TYPE_LABELS[report.wasteType] || report.wasteType,
        description: report.title || report.description,
        date: activityDate,
        timeAgo: getTimeAgo(activityDate),
      };
    });

  if (activities.length === 0) return null;

  return (
    <RevealOnScroll delay={0.35}>
      <div className="glass-premium rounded-2xl border border-white/10 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-bold text-sm">Recent Activity</h3>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50" />

          <div className="space-y-1">
            {activities.map((activity, i) => (
              <motion.div
                key={activity.report._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                onClick={() => onReportClick(activity.report)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onReportClick(activity.report);
                  }
                }}
                role="button"
                tabIndex={0}
                className="flex items-start gap-3 pl-0 py-2 relative cursor-pointer group hover:bg-primary/[0.02] rounded-lg px-1 -mx-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
              >
                {/* Dot */}
                <div
                  className={`relative z-10 p-1 rounded-full ${activity.config.bgClass} ${activity.config.textClass} flex-shrink-0 ring-2 ring-background group-hover:ring-primary/20 transition-all`}
                >
                  {statusIcon[activity.status] || (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/80">
                    <span className="font-medium">
                      {activity.wasteLabel}
                    </span>{" "}
                    report{" "}
                    <span
                      className={`font-medium ${activity.config.textClass}`}
                    >
                      {activity.config.label.toLowerCase()}
                    </span>
                  </p>
                  {activity.description && (
                    <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5 group-hover:text-muted-foreground transition-colors">
                      {activity.description}
                    </p>
                  )}
                </div>

                {/* Time */}
                <span className="text-[11px] text-muted-foreground/50 flex-shrink-0 whitespace-nowrap">
                  {activity.timeAgo}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}
