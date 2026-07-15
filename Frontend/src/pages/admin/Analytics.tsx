import { useState } from "react";
import { RefreshCw, TrendingUp, Users, Clock, BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminTopbar } from "@/components/admin/Topbar";
import { RANGE_LABELS } from "@/components/admin/Topbar";
import { ActivityChart } from "@/components/admin/Charts/ActivityChart";
import { WasteTypeChart } from "@/components/admin/Charts/WasteTypeChart";
import { VolunteerChart } from "@/components/admin/Charts/VolunteerChart";
import { HeatmapChart } from "@/components/admin/Charts/HeatmapChart";
import {
  useAdminOverviewQuery,
  useAdminTrendsQuery,
  useVolunteerPerformanceQuery,
} from "@/hooks/useAdminQueries";
import type { DateRange } from "@/types/admin";

export default function AdminAnalytics() {
  const [range, setRange] = useState<DateRange>("30d");
  const [customDates, setCustomDates] = useState({ from: "", to: "" });

  const from = customDates.from || undefined;
  const to = customDates.to || undefined;

  // React Query hooks
  const { data: overviewRes, isLoading: overviewLoading, refetch: refetchOverview } = useAdminOverviewQuery(range, from, to);
  const { data: trendsRes, isLoading: trendsLoading, refetch: refetchTrends } = useAdminTrendsQuery(range, from, to);
  const { data: volPerfRes, isLoading: volPerfLoading, refetch: refetchVolPerf } = useVolunteerPerformanceQuery(range);

  const overview = overviewRes?.data ?? null;
  const trends = trendsRes?.data ?? [];
  const volPerf = volPerfRes?.data ?? [];
  const loading = overviewLoading || trendsLoading || volPerfLoading;

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopbar
        title="Analytics"
        subtitle="Deep insights into system performance and activity"
        range={range}
        onRangeChange={setRange}
        onCustomDatesChange={(from, to) => setCustomDates({ from, to })}
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `Showing data: ${RANGE_LABELS[range]}`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchOverview();
              refetchTrends();
              refetchVolPerf();
            }}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Reports",
              value: overview?.totals.total ?? "—",
              icon: BarChart2,
              color: "text-primary bg-primary/10",
            },
            {
              label: "Resolved",
              value: overview?.totals.resolved ?? "—",
              icon: TrendingUp,
              color: "text-emerald-600 bg-emerald-100",
            },
            {
              label: "Resolution Rate",
              value: overview ? `${overview.rates.resolutionRate}%` : "—",
              icon: Clock,
              color: "text-amber-600 bg-amber-100",
            },
            {
              label: "Avg Resolution",
              value: overview?.avgResolutionHours != null ? `${overview.avgResolutionHours}h` : "N/A",
              icon: Clock,
              color: "text-sky-600 bg-sky-100",
            },
          ].map((k) => (
            <div key={k.label} className="bg-card border border-border/60 rounded-xl p-4">
              <div className={`w-9 h-9 rounded-xl ${k.color} flex items-center justify-center mb-3`}>
                <k.icon className="w-4 h-4" />
              </div>
              {loading ? (
                <div className="h-7 w-20 bg-muted rounded animate-pulse mb-1" />
              ) : (
                <p className="text-2xl font-bold">{k.value}</p>
              )}
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold">Reports Over Time</h3>
              <p className="text-xs text-muted-foreground">Daily report activity with status breakdown</p>
            </div>
          </div>
          <div className="h-[300px]">
            <ActivityChart data={trends} loading={loading} />
          </div>
        </Card>

        {/* Heatmap chart */}
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold">Geographic Heatmap</h3>
              <p className="text-xs text-muted-foreground">Waste density across all reported locations</p>
            </div>
          </div>
          <div className="h-[400px]">
            <HeatmapChart dateFrom={from} dateTo={to} />
          </div>
        </Card>

        {/* Waste type + urgency */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="border-border/60 p-6">
            <h3 className="font-semibold mb-1">Waste Type Distribution</h3>
            <p className="text-xs text-muted-foreground mb-5">Reports by waste category</p>
            <div className="h-[280px]">
              <WasteTypeChart data={overview?.wasteTypes ?? []} loading={loading} />
            </div>
          </Card>

          <Card className="border-border/60 p-6">
            <h3 className="font-semibold mb-1">Urgency Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-5">Distribution across urgency levels</p>
            <div className="h-[280px] flex flex-col justify-center gap-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                (overview?.urgencyBreakdown ?? []).map((u) => {
                  const total = overview?.totals.total || 1;
                  const pct = Math.round((u.count / total) * 100);
                  const clr: Record<string, string> = {
                    low: "#10b981", medium: "#f59e0b", high: "#ef4444",
                  };
                  const bg: Record<string, string> = {
                    low: "bg-emerald-500", medium: "bg-amber-500", high: "bg-red-500",
                  };
                  return (
                    <div key={u.urgency} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium" style={{ color: clr[u.urgency] }}>
                          {u.urgency} urgency
                        </span>
                        <span className="text-muted-foreground">{u.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bg[u.urgency] || "bg-primary"}`}
                          style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Volunteer performance */}
        <Card className="border-border/60 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold">Volunteer Performance</h3>
              <p className="text-xs text-muted-foreground">Top 10 volunteers by resolved tasks</p>
            </div>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* Chart */}
          <div className="h-[250px] mb-6">
            <VolunteerChart data={volPerf} loading={loading} />
          </div>

          {/* Table */}
          <div className="border border-border/60 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volunteer</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolved</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-5 bg-muted/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}
                {!loading && volPerf.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No volunteer data available</td>
                  </tr>
                )}
                {!loading && volPerf.map((v, i) => (
                  <tr key={v.firebaseUid} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                          {v.user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{v.user?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{v.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{v.assigned}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{v.resolved}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${v.completionRate >= 70 ? "text-emerald-600" : v.completionRate >= 40 ? "text-amber-600" : "text-red-600"}`}>
                        {v.completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {v.avgResolutionHours != null ? `${v.avgResolutionHours}h` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
