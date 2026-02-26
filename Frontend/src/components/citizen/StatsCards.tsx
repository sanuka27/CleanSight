import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { AnimatedCounter, RevealOnScroll } from "@/components/shared/AnimatedComponents";

interface StatusTotals {
  total: number;
  pending: number;
  assigned: number;
  resolved: number;
}

interface StatsCardsProps {
  totals: StatusTotals;
  isLoading: boolean;
}

const stats = [
  {
    key: "total" as const,
    label: "Total Reports",
    icon: MapPin,
    color: "primary",
    gradient: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    description: "All time submissions",
  },
  {
    key: "pending" as const,
    label: "Pending",
    icon: Clock,
    color: "warning",
    gradient: "from-warning/20 to-warning/5",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    description: "Awaiting review",
  },
  {
    key: "assigned" as const,
    label: "In Progress",
    icon: AlertCircle,
    color: "info",
    gradient: "from-info/20 to-info/5",
    iconBg: "bg-info/10",
    iconColor: "text-info",
    description: "Being handled",
  },
  {
    key: "resolved" as const,
    label: "Resolved",
    icon: CheckCircle2,
    color: "success",
    gradient: "from-success/20 to-success/5",
    iconBg: "bg-success/10",
    iconColor: "text-success",
    description: "Completed cleanups",
  },
];

export function StatsCards({ totals, isLoading }: StatsCardsProps) {
  const resolutionRate = totals.total > 0
    ? Math.round((totals.resolved / totals.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => {
          const value = totals[stat.key];
          return (
            <RevealOnScroll key={stat.key} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="glass-premium rounded-2xl border border-white/10 p-4 sm:p-5 relative overflow-hidden group cursor-default"
              >
                {/* Gradient background glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Large watermark icon */}
                <div className="absolute -bottom-2 -right-2 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500">
                  <stat.icon className="w-20 h-20" />
                </div>

                <div className="relative space-y-3">
                  {/* Icon */}
                  <div className={`${stat.iconBg} ${stat.iconColor} p-2.5 rounded-xl w-fit`}>
                    <stat.icon className="w-5 h-5" />
                  </div>

                  {/* Value */}
                  <div>
                    {isLoading ? (
                      <div className="h-9 w-16 rounded-lg bg-muted/30 animate-pulse" />
                    ) : (
                      <h3 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
                        <AnimatedCounter end={value} duration={1.5} />
                      </h3>
                    )}
                    <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                      {stat.label}
                    </p>
                  </div>

                  {/* Subtle description */}
                  <p className="text-[11px] text-muted-foreground/60 hidden sm:block">
                    {stat.description}
                  </p>
                </div>
              </motion.div>
            </RevealOnScroll>
          );
        })}
      </div>

      {/* Resolution rate bar */}
      {totals.total > 0 && (
        <RevealOnScroll delay={0.35}>
          <motion.div
            className="glass-premium rounded-xl border border-white/10 p-4 flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Resolution Rate</span>
                <span className="text-sm font-bold text-success">
                  {resolutionRate}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-success/80 to-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${resolutionRate}%` }}
                  transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        </RevealOnScroll>
      )}
    </div>
  );
}
