import { useQuery } from "@tanstack/react-query";
import { motion, useInView, type Variants } from "framer-motion";
import { memo, useRef } from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  Map,
  ShieldCheck,
  Zap,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { AnimatedCounter, RevealOnScroll } from "@/components/shared/AnimatedComponents";

// ── Animated progress bar ────────────────────────────────────────────────────

function AnimatedBar({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <div ref={ref} className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={inView ? { width: `${percent}%` } : { width: 0 }}
        transition={{ duration: 1.2, ease: [0.34, 1.1, 0.64, 1], delay: 0.2 }}
      />
    </div>
  );
}

// ── Skeleton shimmer ─────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <section id="stats" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted/50" />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const StatsSection = memo(function StatsSection() {
  const { data: statsData, isLoading, isError } = useQuery({
    queryKey: ["publicStats"],
    queryFn: () => api.getPublicStats(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <StatsSkeleton />;
  if (isError || !statsData?.success) return null;

  const { totals, resolutionRate, recentResolved } = statsData.data;

  const kpis = [
    {
      title: "Total Reports",
      value: totals.total,
      icon: Map,
      suffix: "",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      barColor: "bg-blue-500",
      barPct: 100,
      sub: "Community submissions",
    },
    {
      title: "Resolved",
      value: totals.resolved,
      icon: CheckCircle,
      suffix: "",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      barColor: "bg-emerald-500",
      barPct: totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0,
      sub: "Successfully cleaned",
    },
    {
      title: "In Progress",
      value: totals.inProgress,
      icon: Clock,
      suffix: "",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      barColor: "bg-amber-500",
      barPct: totals.total > 0 ? Math.round((totals.inProgress / totals.total) * 100) : 0,
      sub: "Volunteers assigned",
    },
    {
      title: "Resolution Rate",
      value: Math.round(resolutionRate),
      icon: ShieldCheck,
      suffix: "%",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      barColor: "bg-purple-500",
      barPct: Math.round(resolutionRate),
      sub: "City-wide effectiveness",
    },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  const pending = totals.pending ?? (totals.total - totals.resolved - totals.inProgress);

  return (
    <section id="stats" className="py-28 relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 space-y-20">

        {/* ── Section header ─────────────────────────────────────── */}
        <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
            <Activity className="w-4 h-4" />
            <span>Live Community Impact</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Our City. <span className="text-gradient">Real Numbers.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Every report filed, every cleanup completed — see the real-time impact
            CleanSight is making across the community.
          </p>
        </RevealOnScroll>

        {/* ── KPI Cards ──────────────────────────────────────────── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.title}
                variants={itemVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`relative overflow-hidden rounded-2xl border ${kpi.border} bg-card/60 backdrop-blur-md p-6 shadow-xl group cursor-default`}
              >
                {/* Corner glow */}
                <div className={`absolute -top-8 -right-8 w-24 h-24 ${kpi.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                {/* Watermark icon */}
                <div className="absolute -bottom-3 -right-3 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-500">
                  <Icon className="w-20 h-20" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>

                  <div>
                    <p className="text-3xl font-extrabold font-display text-foreground">
                      <AnimatedCounter end={kpi.value} suffix={kpi.suffix} duration={1.6} />
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">
                      {kpi.title}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <AnimatedBar percent={kpi.barPct} color={kpi.barColor} />
                    <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Resolution spotlight banner ───────────────────────── */}
        <RevealOnScroll>
          <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-card/60 to-emerald-500/5 backdrop-blur-md p-8 md:p-12 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
              {/* Big number */}
              <div className="text-center shrink-0">
                <p className="text-7xl sm:text-8xl font-extrabold font-display text-gradient leading-none">
                  <AnimatedCounter end={Math.round(resolutionRate)} suffix="%" duration={2} />
                </p>
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mt-2">
                  Resolution Rate
                </p>
              </div>

              <div className="flex-1 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-4 h-4" /> Resolved
                    </span>
                    <span className="text-muted-foreground">{totals.resolved} / {totals.total}</span>
                  </div>
                  <AnimatedBar
                    percent={totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0}
                    color="bg-gradient-to-r from-emerald-500 to-teal-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4" /> In Progress
                    </span>
                    <span className="text-muted-foreground">{totals.inProgress} active</span>
                  </div>
                  <AnimatedBar
                    percent={totals.total > 0 ? Math.round((totals.inProgress / totals.total) * 100) : 0}
                    color="bg-gradient-to-r from-amber-500 to-orange-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Zap className="w-4 h-4" /> Pending
                    </span>
                    <span className="text-muted-foreground">{pending} awaiting</span>
                  </div>
                  <AnimatedBar
                    percent={totals.total > 0 ? Math.round((pending / totals.total) * 100) : 0}
                    color="bg-gradient-to-r from-blue-500 to-indigo-400"
                  />
                </div>
              </div>

              <div className="hidden md:flex flex-col items-center gap-3 shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <p className="text-xs text-center text-muted-foreground max-w-[120px]">
                  Consistently improving every week
                </p>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* ── Recently Resolved showcase ────────────────────────── */}
        {recentResolved && recentResolved.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="space-y-8"
          >
            <RevealOnScroll className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <h3 className="font-display text-2xl sm:text-3xl font-bold">
                  Real Impact, <span className="text-gradient">Real Cleanups</span>
                </h3>
                <p className="text-muted-foreground text-sm max-w-lg">
                  A glimpse at the latest waste spots our volunteers have cleaned up.
                </p>
              </div>
              <Link
                to="/stats"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
              >
                View all stats <ArrowRight className="w-4 h-4" />
              </Link>
            </RevealOnScroll>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentResolved.slice(0, 3).map((report: any) => {
                const hasAfter = !!report.resolutionImageUrl;
                const title =
                  report.title ||
                  `${report.wasteType.charAt(0).toUpperCase() + report.wasteType.slice(1)} Cleanup`;

                return (
                  <motion.div
                    key={report._id}
                    variants={itemVariants}
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="glass-premium rounded-2xl border border-white/5 overflow-hidden flex flex-col group shadow-xl"
                  >
                    {/* Before / After images */}
                    <div className="relative h-48 w-full overflow-hidden flex bg-muted">
                      {hasAfter ? (
                        <>
                          <div className="w-1/2 h-full relative overflow-hidden border-r border-white/10">
                            <img
                              src={report.imageUrl}
                              alt="Before cleanup"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute bottom-2 left-2 bg-destructive/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              Before
                            </span>
                          </div>
                          <div className="w-1/2 h-full relative overflow-hidden">
                            <img
                              src={report.resolutionImageUrl}
                              alt="After cleanup"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute bottom-2 right-2 bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              After
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full relative overflow-hidden">
                          <img
                            src={report.imageUrl}
                            alt="Resolved report"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className="absolute bottom-2 right-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-400/20">
                            <CheckCircle className="w-3 h-3" /> Resolved
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          {report.wasteType}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.resolvedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground line-clamp-1">{title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
});
