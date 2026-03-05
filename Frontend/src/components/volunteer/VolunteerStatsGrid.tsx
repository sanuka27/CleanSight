import { motion } from "framer-motion";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  BarChart2,
  Calendar,
} from "lucide-react";
import type { DashboardReport, VolunteerMyStats } from "@/types/dashboard";
import {
  avgAgeHours,
  hoursLabel,
  tasksThisMonth,
} from "@/utils/volunteerInsights";

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  colorClass: string;
  bgClass: string;
  delay?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  colorClass,
  bgClass,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="glass-premium rounded-2xl border border-white/8 p-5 relative overflow-hidden group cursor-default"
    >
      {/* Background accent */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${bgClass} rounded-2xl`}
      />

      <div className="relative">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bgClass}`}
        >
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <div className="flex items-end gap-1 mb-1">
          <span className="font-display text-3xl font-bold leading-none">
            {value}
          </span>
        </div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="glass-premium rounded-2xl border border-white/8 p-5 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-muted/30 mb-4" />
      <div className="h-8 w-16 bg-muted/30 rounded mb-2" />
      <div className="h-4 w-24 bg-muted/20 rounded" />
    </div>
  );
}

interface VolunteerStatsGridProps {
  stats: VolunteerMyStats;
  assignedToMe: DashboardReport[];
  resolvedByMe: DashboardReport[];
  isLoading: boolean;
}

export function VolunteerStatsGrid({
  stats,
  assignedToMe,
  resolvedByMe,
  isLoading,
}: VolunteerStatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const avgAge = avgAgeHours(assignedToMe);
  const monthlyCount = tasksThisMonth(resolvedByMe);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={ClipboardList}
        label="Assigned (7d)"
        value={stats.assignedCount}
        sub="tasks accepted"
        colorClass="text-info"
        bgClass="bg-info/10"
        delay={0}
      />
      <StatCard
        icon={Clock}
        label="Active Tasks"
        value={assignedToMe.length}
        sub="needs your action"
        colorClass="text-warning"
        bgClass="bg-warning/10"
        delay={0.07}
      />
      <StatCard
        icon={CheckCircle}
        label="Resolved (7d)"
        value={stats.resolvedCount}
        sub="great work!"
        colorClass="text-success"
        bgClass="bg-success/10"
        delay={0.14}
      />
      <StatCard
        icon={avgAge != null ? BarChart2 : Calendar}
        label={avgAge != null ? "Avg Task Age" : "This Month"}
        value={avgAge != null ? hoursLabel(avgAge) : monthlyCount}
        sub={avgAge != null ? "active task age" : "tasks completed"}
        colorClass="text-primary"
        bgClass="bg-primary/10"
        delay={0.21}
      />
    </div>
  );
}
