import { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  LogOut,
  Home,
  FileText,
  PieChart,
  Settings,
} from "lucide-react";
import { AnimatedCounter, RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPie,
  Cell,
  Pie
} from 'recharts';
import { motion } from "framer-motion";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAdminDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/context/AuthContext";
import { defaultParams, fromPreset, PRESETS } from "@/lib/dateRange";
import { getUserRole, canViewVolunteerAnalytics } from "@/lib/role";
import type { AnalyticsPreset } from "@/types/analytics";

/* ── Fallback mock data (used while loading / on error) ────────── */

const FALLBACK_CHART_DATA = [
  { name: 'Mon', reports: 12, resolved: 8 },
  { name: 'Tue', reports: 19, resolved: 12 },
  { name: 'Wed', reports: 15, resolved: 10 },
  { name: 'Thu', reports: 22, resolved: 18 },
  { name: 'Fri', reports: 28, resolved: 20 },
  { name: 'Sat', reports: 35, resolved: 25 },
  { name: 'Sun', reports: 10, resolved: 15 },
];

const WASTE_TYPE_COLORS: Record<string, string> = {
  general: 'hsl(var(--primary))',
  recyclable: 'hsl(var(--info))',
  organic: 'hsl(var(--success))',
  construction: 'hsl(var(--warning))',
  hazardous: 'hsl(var(--destructive))',
};

const FALLBACK_PIE_DATA = [
  { name: 'Plastic', value: 400, color: 'hsl(var(--primary))' },
  { name: 'Organic', value: 300, color: 'hsl(var(--success))' },
  { name: 'Hazardous', value: 100, color: 'hsl(var(--destructive))' },
  { name: 'Metal', value: 200, color: 'hsl(var(--info))' },
];

const FALLBACK_STATS = [
  { label: "Total Reports", value: 0, suffix: "", change: "--", trend: "up" as const, icon: MapPin, color: "primary" },
  { label: "Active Volunteers", value: 0, suffix: "", change: "--", trend: "up" as const, icon: Users, color: "info" },
  { label: "Cleanups Completed", value: 0, suffix: "", change: "--", trend: "up" as const, icon: CheckCircle, color: "success" },
  { label: "Avg. Response Time", value: 0, suffix: "h", change: "--", trend: "down" as const, icon: Clock, color: "warning" },
];

/* recentActivity is now loaded from /api/dashboard/admin endpoint */

const Dashboard = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [preset, setPreset] = useState<AnalyticsPreset>("7d");

    const { user } = useAuth();
    const {
      summary,
      performance,
      volunteers,
      isLoading,
      error,
      fetchSummary,
      fetchPerformance,
      fetchVolunteers,
    } = useAnalytics();

    const { data: adminData, fetch: fetchAdmin } = useAdminDashboard();

    // Fetch on mount and when preset changes
    useEffect(() => {
      const params = fromPreset(preset);
      fetchSummary(params);
      fetchPerformance(params);
    }, [preset, fetchSummary, fetchPerformance]);

    // Derive user role from backend profile stored in summary
    // (we don't have a separate profile fetch yet — use a safe fallback)
    const userRole = useMemo(() => {
      // If volunteer analytics are already loaded, user is staff/admin
      // This is a safe heuristic; the real gating happens server-side
      return "citizen" as const; // will be replaced by profile fetch later
    }, []);

    // Fetch volunteer analytics only for staff/admin (gated server-side too)
    useEffect(() => {
      if (canViewVolunteerAnalytics("staff")) {
        if (summary) {
          fetchVolunteers(fromPreset(preset));
        }
      }
    }, [summary, preset, fetchVolunteers]);

    // Fetch admin dashboard payload for recent activity
    useEffect(() => {
      fetchAdmin();
    }, [fetchAdmin]);

    /* ── Derived display data (falls back to zeros while loading) ── */

    const stats = useMemo(() => {
      const t = summary?.totals;
      const p = performance;
      return [
        {
          label: "Total Reports",
          value: t?.total ?? 0,
          suffix: "",
          change: summary ? `${summary.rates.resolutionRate}%` : "--",
          trend: "up" as const,
          icon: MapPin,
          color: "primary",
        },
        {
          label: "Assigned",
          value: t?.assigned ?? 0,
          suffix: "",
          change: summary ? `${summary.rates.assignmentRate}%` : "--",
          trend: "up" as const,
          icon: Users,
          color: "info",
        },
        {
          label: "Resolved",
          value: t?.resolved ?? 0,
          suffix: "",
          change: summary ? `${summary.rates.resolutionRate}%` : "--",
          trend: "up" as const,
          icon: CheckCircle,
          color: "success",
        },
        {
          label: "Avg. Resolution",
          value: p?.avgResolutionHours ?? 0,
          suffix: "h",
          change: p?.medianResolutionHours != null ? `~${p.medianResolutionHours}h` : "--",
          trend: "down" as const,
          icon: Clock,
          color: "warning",
        },
      ];
    }, [summary, performance]);

    const CHART_DATA = useMemo(() => {
      if (!summary?.series?.length) return FALLBACK_CHART_DATA;
      return summary.series.map((b) => ({
        name: b.date.slice(5), // MM-DD
        reports: b.count,
        resolved: 0, // series only has total; resolved needs separate query
      }));
    }, [summary]);

    const PIE_DATA = useMemo(() => {
      if (!summary?.topWasteTypes?.length) return FALLBACK_PIE_DATA;
      return summary.topWasteTypes.map((w) => ({
        name: w.wasteType,
        value: w.count,
        color: WASTE_TYPE_COLORS[w.wasteType] || 'hsl(var(--muted-foreground))',
      }));
    }, [summary]);

    const pieTotal = useMemo(
      () => PIE_DATA.reduce((sum, d) => sum + d.value, 0),
      [PIE_DATA]
    );

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />
            
            <div className="flex-1 flex pt-20">
                {/* Fixed Sidebar */}
                <motion.aside
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1, width: sidebarOpen ? 260 : 80 }}
                    className="hidden lg:flex flex-col border-r border-border/50 glass-premium sticky top-20 h-[calc(100vh-5rem)] z-30 overflow-hidden transition-all duration-300"
                >
                    <div className="flex-1 py-6 px-3">
                         <nav className="space-y-2">
                             {[
                                { icon: Home, label: "Overview", active: true },
                                { icon: MapPin, label: "Reports", active: false },
                                { icon: Users, label: "Volunteers", active: false },
                                { icon: PieChart, label: "Analytics", active: false },
                                { icon: FileText, label: "Documents", active: false },
                                { icon: Settings, label: "Settings", active: false },
                             ].map((item, index) => (
                                 <button
                                    key={index}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                                        ${item.active 
                                            ? "gradient-primary text-white shadow-glow" 
                                            : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                        }
                                    `}
                                 >
                                     <item.icon className="w-5 h-5 flex-shrink-0" />
                                     <span className={`font-medium transition-opacity duration-300 ${!sidebarOpen && "opacity-0 hidden"}`}>
                                         {item.label}
                                     </span>
                                     {item.active && sidebarOpen && (
                                         <motion.div layoutId="active-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                     )}
                                 </button>
                             ))}
                         </nav>
                    </div>
                    
                    <div className="p-4 border-t border-border/50">
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all group">
                             <LogOut className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                             <span className={`font-medium ${!sidebarOpen && "hidden"}`}>Sign Out</span>
                        </button>
                    </div>
                </motion.aside>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Header */}
                        <RevealOnScroll>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="font-display text-3xl font-bold mb-2">
                                        Hello, <span className="text-gradient">{user?.displayName?.split(' ')[0] || 'there'}</span>
                                    </h1>
                                    <p className="text-muted-foreground">
                                        {isLoading ? 'Loading analytics…' : error ? 'Could not load analytics.' : "Here's what's happening in your area today."}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" className="glass gap-2">
                                        <Calendar className="w-4 h-4" />
                                        This Week
                                    </Button>
                                    <Button className="gradient-primary text-white shadow-glow gap-2">
                                        <BarChart3 className="w-4 h-4" />
                                        Export Report
                                    </Button>
                                </div>
                            </div>
                        </RevealOnScroll>

                        {/* Stats Cards */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {stats.map((stat, i) => (
                                <RevealOnScroll key={stat.label} delay={i * 0.1}>
                                    <motion.div 
                                        whileHover={{ y: -4 }}
                                        className="glass-premium p-6 rounded-2xl border border-white/5 relative overflow-hidden group"
                                    >
                                        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity bg-${stat.color}/10 rounded-bl-3xl`}>
                                            <stat.icon className={`w-12 h-12 text-${stat.color}`} />
                                        </div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-xl bg-${stat.color}/10 text-${stat.color}`}>
                                                <stat.icon className="w-6 h-6" />
                                            </div>
                                            <Badge variant="outline" className={`${stat.trend === 'up' ? 'text-success border-success/20 bg-success/5' : 'text-destructive border-destructive/20 bg-destructive/5'}`}>
                                                {stat.change}
                                                <TrendingUp className={`w-3 h-3 ml-1 ${stat.trend === 'down' && 'rotate-180'}`} />
                                            </Badge>
                                        </div>
                                        <h3 className="text-3xl font-bold font-display mb-1">
                                            <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                                        </h3>
                                        <p className="text-muted-foreground text-sm">{stat.label}</p>
                                    </motion.div>
                                </RevealOnScroll>
                            ))}
                        </div>

                        {/* Charts Section */}
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Main Chart */}
                            <RevealOnScroll className="lg:col-span-2">
                                <Card className="glass-premium border-white/5 p-6 h-[400px]">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-lg">Activity Overview</h3>
                                        <select className="bg-transparent border border-border rounded-lg text-sm p-1 outline-none text-muted-foreground">
                                            <option>Weekly</option>
                                            <option>Monthly</option>
                                        </select>
                                    </div>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <AreaChart data={CHART_DATA}>
                                            <defs>
                                                <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                            />
                                            <Area type="monotone" dataKey="reports" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorReports)" />
                                            <Area type="monotone" dataKey="resolved" stroke="hsl(var(--info))" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Card>
                            </RevealOnScroll>

                            {/* Donut Chart */}
                            <RevealOnScroll delay={0.2}>
                                <Card className="glass-premium border-white/5 p-6 h-[400px]">
                                    <h3 className="font-bold text-lg mb-6">Waste Composition</h3>
                                    <div className="h-[250px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsPie width={400} height={400}>
                                                <Pie
                                                    data={PIE_DATA}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {PIE_DATA.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </RechartsPie>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <p className="text-3xl font-bold">{pieTotal}</p>
                                                <p className="text-xs text-muted-foreground">Total</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                                        {PIE_DATA.map(item => (
                                            <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                {item.name}
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </RevealOnScroll>
                        </div>

                        {/* Recent Activity */}
                        <RevealOnScroll delay={0.3}>
                            <Card className="glass-premium border-white/5 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-lg">Recent Updates</h3>
                                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All</Button>
                                </div>
                                <div className="space-y-6">
                                    {(adminData?.recentReports ?? []).map((report, i) => {
                                        const statusMap: Record<string, string> = {
                                          resolved: 'completed',
                                          pending: 'pending',
                                          assigned: 'assigned',
                                        };
                                        const displayStatus = statusMap[report.status] || report.status;
                                        const timeAgo = new Date(report.createdAt).toLocaleDateString('en-US', {
                                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                        });
                                        return (
                                        <div key={report._id || i} className="flex items-start gap-4">
                                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-background shrink-0
                                                ${displayStatus === 'completed' ? 'bg-success/10 text-success' : 
                                                  report.urgency === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}
                                            `}>
                                                {displayStatus === 'completed' ? <CheckCircle className="w-5 h-5"/> : 
                                                 report.urgency === 'high' ? <AlertCircle className="w-5 h-5"/> : <Clock className="w-5 h-5"/>}
                                            </div>
                                            <div className="flex-1 pt-1 pb-6 border-b border-border/50 last:border-0 last:pb-0">
                                                <p className="font-medium text-sm">{report.description || `${report.wasteType} report — ${report.status}`}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    {(!adminData?.recentReports || adminData.recentReports.length === 0) && (
                                      <p className="text-center text-muted-foreground py-4">No recent activity</p>
                                    )}
                                </div>
                            </Card>
                        </RevealOnScroll>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
};

export default Dashboard;
