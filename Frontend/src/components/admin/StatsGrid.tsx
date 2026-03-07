import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface StatCard {
  label: string;
  value: number | string;
  suffix?: string;
  change?: string | number;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  color: "primary" | "success" | "warning" | "destructive" | "info" | "muted";
  loading?: boolean;
}

interface StatsGridProps {
  stats: StatCard[];
}

const colorConfig = {
  primary:     { bg: "bg-primary/10",      text: "text-primary",      badge: "text-primary border-primary/30 bg-primary/5" },
  success:     { bg: "bg-emerald-500/10",  text: "text-emerald-600",  badge: "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" },
  warning:     { bg: "bg-amber-500/10",    text: "text-amber-600",    badge: "text-amber-600 border-amber-500/30 bg-amber-500/5" },
  destructive: { bg: "bg-red-500/10",      text: "text-red-600",      badge: "text-red-600 border-red-500/30 bg-red-500/5" },
  info:        { bg: "bg-sky-500/10",      text: "text-sky-600",      badge: "text-sky-600 border-sky-500/30 bg-sky-500/5" },
  muted:       { bg: "bg-muted",           text: "text-muted-foreground", badge: "text-muted-foreground border-border bg-muted" },
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const cfg = colorConfig[stat.color];
        const TrendIcon =
          stat.trend === "up"
            ? TrendingUp
            : stat.trend === "down"
            ? TrendingDown
            : Minus;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="bg-card border border-border/60 rounded-2xl p-5 relative overflow-hidden group"
          >
            {/* Background icon watermark */}
            <div className={`absolute -right-3 -bottom-3 opacity-[0.06] ${cfg.text}`}>
              <stat.icon className="w-20 h-20" />
            </div>

            {/* Icon + badge */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.text}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.change !== undefined && (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
                  <TrendIcon className="w-3 h-3" />
                  {typeof stat.change === "number" ? `${stat.change}%` : stat.change}
                </span>
              )}
            </div>

            {/* Value */}
            {stat.loading ? (
              <div className="h-8 w-24 bg-muted rounded-lg animate-pulse mb-1" />
            ) : (
              <p className="text-3xl font-bold font-mono tracking-tight mb-0.5">
                {stat.value}
                {stat.suffix && (
                  <span className="text-lg font-normal text-muted-foreground ml-0.5">{stat.suffix}</span>
                )}
              </p>
            )}

            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
