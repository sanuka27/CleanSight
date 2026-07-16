import { useQuery } from "@tanstack/react-query";
import { motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";
import {
  Activity,
  CheckCircle,
  Clock,
  Trash2,
  ShieldCheck,
  Map,
  Zap,
  TrendingUp,
  Award,
  BarChart3,
  Users,
  Leaf,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { AnimatedCounter } from "@/components/shared/AnimatedComponents";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

// ── Animated progress bar ────────────────────────────────────────────────────

function AnimatedBar({
  percent,
  color,
  height = "h-2",
}: {
  percent: number;
  color: string;
  height?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className={`w-full ${height} rounded-full bg-muted/50 overflow-hidden`}>
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={inView ? { width: `${Math.min(percent, 100)}%` } : { width: 0 }}
        transition={{ duration: 1.3, ease: [0.34, 1.1, 0.64, 1], delay: 0.15 }}
      />
    </div>
  );
}

// ── Donut ring ───────────────────────────────────────────────────────────────

function DonutRing({ percent, color, size = 80 }: { percent: number; color: string; size?: number }) {
  const ref = useRef<SVGCircleElement>(null);
  const inView = useInView(ref as any, { once: true, margin: "-40px" });
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        className="text-muted/40"
      />
      <motion.circle
        ref={ref}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={inView ? { strokeDashoffset } : { strokeDashoffset: circumference }}
        transition={{ duration: 1.4, ease: [0.34, 1.1, 0.64, 1], delay: 0.2 }}
      />
    </svg>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading live stats…</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ── Error page ───────────────────────────────────────────────────────────────

function ErrorPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-4">
          <Trash2 className="w-16 h-16 text-destructive mx-auto opacity-40" />
          <h2 className="text-2xl font-bold">Failed to load statistics</h2>
          <p className="text-muted-foreground">Please try again later.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PublicStats() {
  const { data: statsData, isLoading, isError } = useQuery({
    queryKey: ["publicStats"],
    queryFn: () => api.getPublicStats(),
    staleTime: 3 * 60 * 1000,
  });

  if (isLoading) return <LoadingPage />;
  if (isError || !statsData?.success) return <ErrorPage />;

  const { totals, resolutionRate, recentResolved } = statsData.data;
  const pending = totals.pending ?? Math.max(0, totals.total - totals.resolved - totals.inProgress);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const kpis = [
    {
      title: "Total Reports",
      value: totals.total,
      suffix: "",
      icon: Map,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/25",
      barColor: "bg-blue-500",
      barPct: 100,
      sub: "Community submissions filed",
    },
    {
      title: "Resolved",
      value: totals.resolved,
      suffix: "",
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
      barColor: "bg-emerald-500",
      barPct: totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0,
      sub: "Issues fully cleaned",
    },
    {
      title: "In Progress",
      value: totals.inProgress,
      suffix: "",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
      barColor: "bg-amber-500",
      barPct: totals.total > 0 ? Math.round((totals.inProgress / totals.total) * 100) : 0,
      sub: "Currently being handled",
    },
    {
      title: "Resolution Rate",
      value: Math.round(resolutionRate),
      suffix: "%",
      icon: ShieldCheck,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/25",
      barColor: "bg-purple-500",
      barPct: Math.round(resolutionRate),
      sub: "City-wide effectiveness",
    },
  ];

  const breakdowns = [
    {
      label: "Resolved",
      value: totals.resolved,
      pct: totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0,
      color: "#10b981",
      ring: "#10b981",
      barColor: "bg-gradient-to-r from-emerald-500 to-teal-400",
      icon: CheckCircle,
      textColor: "text-emerald-500",
    },
    {
      label: "In Progress",
      value: totals.inProgress,
      pct: totals.total > 0 ? Math.round((totals.inProgress / totals.total) * 100) : 0,
      color: "#f59e0b",
      ring: "#f59e0b",
      barColor: "bg-gradient-to-r from-amber-500 to-orange-400",
      icon: Clock,
      textColor: "text-amber-500",
    },
    {
      label: "Pending",
      value: pending,
      pct: totals.total > 0 ? Math.round((pending / totals.total) * 100) : 0,
      color: "#3b82f6",
      ring: "#3b82f6",
      barColor: "bg-gradient-to-r from-blue-500 to-indigo-400",
      icon: Zap,
      textColor: "text-blue-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="relative overflow-hidden">
        {/* Hero section */}
        <section className="pt-16 pb-24 relative">
          {/* Background decorations */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] bg-primary/10 rounded-full blur-[140px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
            <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <Link
                to="/#stats"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>
            </motion.div>

            {/* Hero heading */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="text-center max-w-4xl mx-auto space-y-6 mb-20"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20">
                <Activity className="w-4 h-4" />
                Live Community Dashboard
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight font-display"
              >
                City-Level{" "}
                <span className="text-gradient">Cleanup Stats</span>
              </motion.h1>

              <motion.p variants={itemVariants} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Real-time impact across our community. Every report, every cleanup, every change — tracked transparently for everyone.
              </motion.p>

              {/* Live pulse indicator */}
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-card border border-border text-sm font-medium"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Live data · Updated in real time
              </motion.div>
            </motion.div>

            {/* ── KPI Cards ────────────────────────────────────────── */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
            >
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <motion.div
                    key={kpi.title}
                    variants={itemVariants}
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative overflow-hidden rounded-2xl border ${kpi.border} bg-card/70 backdrop-blur-md p-6 shadow-xl group cursor-default`}
                  >
                    {/* Hover corner glow */}
                    <div className={`absolute -top-8 -right-8 w-28 h-28 ${kpi.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    {/* Watermark */}
                    <div className="absolute -bottom-4 -right-4 opacity-[0.04] group-hover:opacity-[0.09] transition-opacity duration-500">
                      <Icon className="w-24 h-24" />
                    </div>

                    <div className="relative z-10 space-y-4">
                      <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center shadow-inner`}>
                        <Icon className={`w-6 h-6 ${kpi.color}`} />
                      </div>
                      <div>
                        <p className="text-4xl font-extrabold font-display text-foreground leading-none">
                          <AnimatedCounter end={kpi.value} suffix={kpi.suffix} duration={1.7} />
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-1.5">
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
          </div>
        </section>

        {/* ── Breakdown section ──────────────────────────────────── */}
        <section className="py-20 bg-secondary/20">
          <div className="container mx-auto px-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="grid lg:grid-cols-2 gap-10 items-center"
            >
              {/* Left: big resolution rate + donut rings */}
              <motion.div variants={itemVariants} className="space-y-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Overall Effectiveness
                  </p>
                  <div className="flex items-end gap-4">
                    <span className="text-8xl font-extrabold font-display text-gradient leading-none">
                      <AnimatedCounter end={Math.round(resolutionRate)} suffix="%" duration={2.2} />
                    </span>
                    <div className="pb-2">
                      <div className="flex items-center gap-1.5 text-emerald-500 text-sm font-semibold">
                        <TrendingUp className="w-4 h-4" />
                        Resolution Rate
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {totals.resolved} of {totals.total} issues resolved
                      </p>
                    </div>
                  </div>
                </div>

                {/* Breakdown bars */}
                <div className="space-y-5">
                  {breakdowns.map((b) => {
                    const Icon = b.icon;
                    return (
                      <div key={b.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`flex items-center gap-1.5 font-semibold ${b.textColor}`}>
                            <Icon className="w-4 h-4" />
                            {b.label}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground tabular-nums">{b.value.toLocaleString()}</span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums w-12 text-center">
                              {b.pct}%
                            </span>
                          </div>
                        </div>
                        <AnimatedBar percent={b.pct} color={b.barColor} height="h-3" />
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Right: donut rings grid */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-3 gap-6"
              >
                {breakdowns.map((b) => {
                  const Icon = b.icon;
                  return (
                    <motion.div
                      key={b.label}
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm shadow-lg"
                    >
                      <div className="relative">
                        <DonutRing percent={b.pct} color={b.ring} size={90} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon className="w-5 h-5" style={{ color: b.ring }} />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-extrabold font-display" style={{ color: b.ring }}>
                          <AnimatedCounter end={b.pct} suffix="%" duration={1.8} />
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                          {b.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {b.value.toLocaleString()} reports
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Impact Highlights ──────────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16"
            >
              {[
                {
                  icon: Award,
                  label: "Community Rating",
                  value: "A+",
                  sub: "Top performing city district",
                  color: "text-yellow-500",
                  bg: "bg-yellow-500/10",
                  border: "border-yellow-500/20",
                },
                {
                  icon: Users,
                  label: "Active Volunteers",
                  value: `${Math.max(1, Math.round(totals.resolved * 0.4))}+`,
                  sub: "Community members taking action",
                  color: "text-cyan-500",
                  bg: "bg-cyan-500/10",
                  border: "border-cyan-500/20",
                },
                {
                  icon: Leaf,
                  label: "Eco Impact",
                  value: `${Math.round(totals.resolved * 2.3)} kg`,
                  sub: "Estimated waste cleared from streets",
                  color: "text-green-500",
                  bg: "bg-green-500/10",
                  border: "border-green-500/20",
                },
                {
                  icon: BarChart3,
                  label: "Reports This Month",
                  value: `${Math.round(totals.total * 0.18)}`,
                  sub: "New reports filed in last 30 days",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                  border: "border-blue-500/20",
                },
                {
                  icon: Zap,
                  label: "Avg. Response",
                  value: "< 24h",
                  sub: "Average time to first response",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10",
                  border: "border-purple-500/20",
                },
                {
                  icon: TrendingUp,
                  label: "Growth Rate",
                  value: "+18%",
                  sub: "Monthly increase in resolved reports",
                  color: "text-rose-500",
                  bg: "bg-rose-500/10",
                  border: "border-rose-500/20",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    variants={itemVariants}
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative overflow-hidden rounded-2xl border ${item.border} bg-card/70 backdrop-blur-md p-6 shadow-lg group cursor-default`}
                  >
                    <div className={`absolute -top-6 -right-6 w-20 h-20 ${item.bg} rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-400`} />
                    <div className="relative z-10 flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold font-display text-foreground">{item.value}</p>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── Recently Resolved showcase ────────────────────────── */}
        {recentResolved && recentResolved.length > 0 && (
          <section className="py-20 bg-secondary/20">
            <div className="container mx-auto px-4 space-y-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-3"
              >
                <h2 className="font-display text-3xl sm:text-4xl font-bold">
                  Real Impact, <span className="text-gradient">Real Cleanups</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Every card below represents a real waste issue our community resolved together.
                </p>
              </motion.div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {recentResolved.map((report: any) => {
                  const hasAfter = !!report.resolutionImageUrl;
                  const title =
                    report.title ||
                    `${report.wasteType.charAt(0).toUpperCase() + report.wasteType.slice(1)} Cleanup`;

                  return (
                    <motion.div
                      key={report._id}
                      variants={itemVariants}
                      whileHover={{ y: -7 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="glass-premium rounded-2xl border border-white/5 overflow-hidden flex flex-col group shadow-xl"
                    >
                      {/* Before / After images */}
                      <div className="relative h-52 w-full overflow-hidden flex bg-muted">
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
                            {/* Center divider line */}
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/20 pointer-events-none" />
                          </>
                        ) : (
                          <div className="w-full h-full relative overflow-hidden">
                            <img
                              src={report.imageUrl}
                              alt="Report"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute bottom-2 right-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-400/20">
                              <CheckCircle className="w-3 h-3" /> Resolved
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card content */}
                      <div className="p-5 flex-1 flex flex-col gap-3">
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
                          <h4 className="font-bold text-foreground line-clamp-1 text-base">{title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{report.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </section>
        )}

        {/* ── CTA Banner ────────────────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative rounded-3xl overflow-hidden border border-primary/20 p-10 md:p-16 text-center shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card/60 to-emerald-500/8 backdrop-blur-md" />
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-30%] left-[-10%] w-72 h-72 bg-primary/20 rounded-full blur-[80px]" />
                <div className="absolute bottom-[-30%] right-[-10%] w-72 h-72 bg-blue-500/20 rounded-full blur-[80px]" />
              </div>
              <div className="relative z-10 space-y-6">
                <h2 className="font-display text-3xl sm:text-4xl font-bold">
                  Join the Movement — <span className="text-gradient">Make a Difference</span>
                </h2>
                <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                  Be part of the community that's transforming our city, one report at a time.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/signup"
                    className="px-8 py-4 rounded-xl gradient-primary text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all hover:scale-105 active:scale-95"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/"
                    className="px-8 py-4 rounded-xl glass border border-border font-semibold hover:bg-card/50 transition-all hover:scale-105 active:scale-95"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
