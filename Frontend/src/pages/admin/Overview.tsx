import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Users, CheckCircle, Clock,
  AlertCircle, RefreshCw, TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminTopbar } from "@/components/admin/Topbar";
import { RANGE_LABELS } from "@/components/admin/Topbar";
import { StatsGrid } from "@/components/admin/StatsGrid";
import { ActivityChart } from "@/components/admin/Charts/ActivityChart";
import { WasteTypeChart } from "@/components/admin/Charts/WasteTypeChart";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/useAuth";
import {
  useAdminOverviewQuery,
  useAdminTrendsQuery,
  useAdminReportsQuery,
} from "@/hooks/useAdminQueries";
import type {
  AdminReport,
  DateRange,
} from "@/types/admin";
import { exportToCsv } from "@/utils/exportCsv";

const STATUS_BADGE: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-700 border-amber-200",
  verified:    "bg-sky-100 text-sky-700 border-sky-200",
  assigned:    "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-violet-100 text-violet-700 border-violet-200",
  resolved:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected:    "bg-red-100 text-red-700 border-red-200",
};

export default function AdminOverview() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>("7d");
  const [customDates, setCustomDates] = useState({ from: "", to: "" });

  // React Query hooks
  const from = customDates.from || undefined;
  const to = customDates.to || undefined;
  
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useAdminOverviewQuery(range, from, to);
  const { data: trendsData, isLoading: trendsLoading, refetch: refetchTrends } = useAdminTrendsQuery(range, from, to);
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useAdminReportsQuery({ 
    limit: 8, 
    sortBy: "updatedAt", 
    sortOrder: "desc" 
  });

  const overview = overviewData?.data ?? null;
  const trends = trendsData?.data ?? [];
  const recentReports = reportsData?.data ?? [];
  const loading = overviewLoading || trendsLoading || reportsLoading;

  const handleRefresh = () => {
    refetchOverview();
    refetchTrends();
    refetchReports();
  };

  const stats = useMemo(() => overview
    ? [
        {
          label: "Total Reports",
          value: overview.totals.total,
          change: `${overview.rates.resolutionRate}%`,
          trend: "up" as const,
          icon: MapPin,
          color: "primary" as const,
          loading,
        },
        {
          label: "Pending",
          value: overview.totals.pending + overview.totals.verified,
          change: overview.totals.pending,
          trend: "flat" as const,
          icon: Clock,
          color: "warning" as const,
          loading,
        },
        {
          label: "In Progress",
          value: overview.totals.assigned + overview.totals.inProgress,
          change: overview.rates.assignmentRate + "%",
          trend: "up" as const,
          icon: Users,
          color: "info" as const,
          loading,
        },
        {
          label: "Resolved",
          value: overview.totals.resolved,
          change: `${overview.rates.resolutionRate}%`,
          trend: "up" as const,
          icon: CheckCircle,
          color: "success" as const,
          loading,
        },
      ]
    : [
        { label: "Total Reports", value: 0, icon: MapPin, color: "primary" as const, loading: true },
        { label: "Pending",       value: 0, icon: Clock, color: "warning" as const, loading: true },
        { label: "In Progress",   value: 0, icon: Users, color: "info" as const, loading: true },
        { label: "Resolved",      value: 0, icon: CheckCircle, color: "success" as const, loading: true },
      ], [overview, loading]);

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopbar
        title={`Hello, ${appUser?.name?.split(" ")[0] || "Admin"}`}
        subtitle="Here's what's happening across your area."
        range={range}
        onRangeChange={setRange}
        onCustomDatesChange={(from, to) => setCustomDates({ from, to })}
        onExport={() => {
          if (!overview) return;
          exportToCsv(
            [
              { metric: "Total Reports", value: overview.totals.total },
              { metric: "Pending", value: overview.totals.pending },
              { metric: "Resolved", value: overview.totals.resolved },
              { metric: "Resolution Rate %", value: overview.rates.resolutionRate },
              { metric: "Avg Resolution Hours", value: overview.avgResolutionHours ?? "N/A" },
            ],
            "admin-overview"
          );
        }}
        exportLabel="Export CSV"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Refresh */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading data…" : `Showing data: ${RANGE_LABELS[range]}`}
          </p>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <StatsGrid stats={stats} />

        {/* KPI bullets */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Verified",    value: overview.totals.verified,   color: "bg-sky-500" },
              { label: "Rejected",    value: overview.totals.rejected,   color: "bg-red-500" },
              { label: "New Users",   value: overview.newUsers,          color: "bg-purple-500" },
              {
                label: "Avg Resolution",
                value: overview.avgResolutionHours != null
                  ? `${overview.avgResolutionHours}h`
                  : "N/A",
                color: "bg-orange-500",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="flex items-center gap-3 bg-card border border-border/60 rounded-xl p-4">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${kpi.color}`} />
                <div>
                  <p className="text-lg font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold">Reports Trend</h3>
                <p className="text-xs text-muted-foreground">Daily report activity</p>
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="h-[260px]">
              <ActivityChart data={trends} loading={loading} />
            </div>
          </Card>

          <Card className="border-border/60 p-6">
            <div className="mb-5">
              <h3 className="font-semibold">Waste Composition</h3>
              <p className="text-xs text-muted-foreground">By type</p>
            </div>
            <div className="h-[260px]">
              <WasteTypeChart data={overview?.wasteTypes ?? []} loading={loading} />
            </div>
          </Card>
        </div>

        {/* Urgency breakdown */}
        {overview && overview.urgencyBreakdown.length > 0 && (
          <Card className="border-border/60 p-6">
            <h3 className="font-semibold mb-4">Urgency Breakdown</h3>
            <div className="flex flex-wrap gap-6">
              {overview.urgencyBreakdown.map((u) => {
                const pct = overview.totals.total > 0
                  ? Math.round((u.count / overview.totals.total) * 100)
                  : 0;
                const colors = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };
                const bg = { low: "bg-emerald-100", medium: "bg-amber-100", high: "bg-red-100" };
                return (
                  <div key={u.urgency} className="flex-1 min-w-[100px]">
                    <div className={`rounded-xl p-4 ${bg[u.urgency] || "bg-muted"}`}>
                      <p className="text-2xl font-bold">{u.count}</p>
                      <p className="text-sm capitalize font-medium" style={{ color: colors[u.urgency] }}>
                        {u.urgency}
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-black/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: colors[u.urgency] }}
                        />
                      </div>
                      <p className="text-xs mt-1 font-medium" style={{ color: colors[u.urgency] }}>{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Recent Reports */}
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold">Recent Reports</h3>
            <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => navigate("/dashboard/admin/reports")}>
              View All
            </Button>
          </div>

          <div className="space-y-3">
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
            ))}
            {!loading && recentReports.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No reports yet</p>
            )}
            {!loading && recentReports.map((r) => (
              <div
                key={r._id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => navigate("/dashboard/admin/reports")}
              >
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border/40" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.title || r.description?.slice(0, 55) || "Untitled report"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge className={`border font-medium text-xs shrink-0 ${STATUS_BADGE[r.status] || "bg-muted"}`}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
