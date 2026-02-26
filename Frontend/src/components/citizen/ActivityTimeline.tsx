import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRightCircle,
  Activity,
} from "lucide-react";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { getStatusConfig } from "@/utils/reportStatus";
import type { DashboardReport } from "@/types/dashboard";

interface ActivityTimelineProps {
  reports: DashboardReport[];
}

function getTimeAgo(dateStr: string): string {
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

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  assigned: <ArrowRightCircle className="w-3.5 h-3.5" />,
  resolved: <CheckCircle2 className="w-3.5 h-3.5" />,
};

export function ActivityTimeline({ reports }: ActivityTimelineProps) {
  // Build timeline from recent reports using updatedAt / createdAt
  // Show the most recently updated reports as activity items
  const activities = [...reports]
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    })
    .slice(0, 5)
    .map((report) => {
      const config = getStatusConfig(report.status);
      const activityDate = report.updatedAt || report.createdAt;
      return {
        id: report._id,
        status: report.status,
        config,
        wasteType: report.wasteType,
        description: report.description,
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
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="flex items-start gap-3 pl-0 py-2 relative"
              >
                {/* Dot */}
                <div
                  className={`relative z-10 p-1 rounded-full ${activity.config.bgClass} ${activity.config.textClass} flex-shrink-0 ring-2 ring-background`}
                >
                  {statusIcon[activity.status] || (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/80">
                    <span className="font-medium capitalize">
                      {activity.wasteType}
                    </span>{" "}
                    report{" "}
                    <span className={`font-medium ${activity.config.textClass}`}>
                      {activity.config.label.toLowerCase()}
                    </span>
                  </p>
                  {activity.description && (
                    <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
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
