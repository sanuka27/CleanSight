import { useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminTopbar, RANGE_LABELS } from "@/components/admin/Topbar";
import {
  useMLSummaryQuery,
  usePhase1MetricsQuery,
  usePhase2MetricsQuery,
  useMLTrendsQuery,
  useWeakPointsQuery,
} from "@/hooks/useAdminQueries";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DateRange = "7d" | "30d" | "90d" | "custom";

const COLORS = {
  primary: "#10b981",
  secondary: "#3b82f6",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#a855f7",
  teal: "#14b8a6",
  slate: "#64748b",
};

const CATEGORY_COLORS: Record<string, string> = {
  glass: "#06b6d4",
  mixed: "#8b5cf6",
  paper: "#f59e0b",
  plastic: "#ef4444",
};

export default function MLAnalytics() {
  const [range, setRange] = useState<DateRange>("30d");
  const [customDates, setCustomDates] = useState({ from: "", to: "" });

  const from = range === "custom" && customDates.from ? customDates.from : undefined;
  const to = range === "custom" && customDates.to ? customDates.to : undefined;

  // React Query hooks
  const { data: summaryRes, isLoading: summaryLoading, refetch: refetchSummary } = useMLSummaryQuery(range, from, to);
  const { data: phase1Res, isLoading: phase1Loading, refetch: refetchPhase1 } = usePhase1MetricsQuery(range, from, to);
  const { data: phase2Res, isLoading: phase2Loading, refetch: refetchPhase2 } = usePhase2MetricsQuery(range, from, to);
  const { data: trendsRes, isLoading: trendsLoading, refetch: refetchTrends } = useMLTrendsQuery(range, from, to);
  const { data: weakRes, isLoading: weakLoading, refetch: refetchWeakPoints } = useWeakPointsQuery(range, from, to);

  const summary = summaryRes?.data ?? null;
  const phase1 = phase1Res?.data ?? null;
  const phase2 = phase2Res?.data ?? null;
  const trends = trendsRes?.data?.trends ?? [];
  const weakPoints = weakRes?.data?.categories ?? [];
  const loading = summaryLoading || phase1Loading || phase2Loading || trendsLoading || weakLoading;

  // Prepare chart data
  const phase1LabelData = phase1?.labelDistribution.map((item) => ({
    name: item._id === "trash" ? "Valid Trash" : item._id === "non-trash" ? "Non-Trash" : item._id,
    value: item.count,
    avgConfidence: item.avgConfidence,
  })) || [];

  const phase1ReviewData = phase1?.reviewStatusDistribution.map((item) => ({
    name: item._id.replace(/_/g, " "),
    value: item.count,
  })) || [];

  const predictedCategoryData = phase2?.predictedCategoryDistribution.map((item) => ({
    category: item._id,
    count: item.count,
    avgConfidence: item.avgConfidence,
  })) || [];

  const finalCategoryData = phase2?.finalCategoryDistribution.map((item) => ({
    category: item._id,
    count: item.count,
  })) || [];

  const phase2ReviewData = phase2?.reviewStatusDistribution.map((item) => ({
    name: item._id.replace(/_/g, " "),
    value: item.count,
  })) || [];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AdminTopbar
        title="ML Analytics"
        subtitle="Monitor ML model performance and review workflows"
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
              refetchSummary();
              refetchPhase1();
              refetchPhase2();
              refetchTrends();
              refetchWeakPoints();
            }}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div className="text-right">
                {loading ? (
                  <div className="h-7 w-16 bg-muted rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold">{summary?.totalReports || 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Total Predictions</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">ML processed reports</p>
          </Card>

          <Card className="p-4 border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="text-right">
                {loading ? (
                  <div className="h-7 w-16 bg-muted rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold">{summary?.phase1.approvalRate || 0}%</p>
                )}
                <p className="text-xs text-muted-foreground">Phase 1 Approval</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Binary validation rate</p>
          </Card>

          <Card className="p-4 border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-right">
                {loading ? (
                  <div className="h-7 w-16 bg-muted rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold">{summary?.phase2.autoAcceptRate || 0}%</p>
                )}
                <p className="text-xs text-muted-foreground">Phase 2 Auto-Accept</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Category auto-accepted</p>
          </Card>

          <Card className="p-4 border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-right">
                {loading ? (
                  <div className="h-7 w-16 bg-muted rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold">{summary?.reviewQueueSize || 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Review Queue</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Needs manual review</p>
          </Card>
        </div>

        {/* ML Trends Over Time */}
        <Card className="p-6 border-border/60">
          <div className="mb-5">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              ML Predictions Over Time
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Daily prediction activity and review status breakdown
            </p>
          </div>
          <div className="h-[320px]">
            {loading ? (
              <div className="h-full w-full bg-muted/20 rounded-lg animate-pulse" />
            ) : trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No trend data available for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalPredictions"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Total Predictions"
                  />
                  <Line
                    type="monotone"
                    dataKey="phase1Approved"
                    stroke={COLORS.secondary}
                    strokeWidth={2}
                    name="Phase 1 Approved"
                  />
                  <Line
                    type="monotone"
                    dataKey="phase2AutoAccepted"
                    stroke={COLORS.purple}
                    strokeWidth={2}
                    name="Phase 2 Auto-Accepted"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Phase 1 & Phase 2 Side-by-Side */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Phase 1: Binary Validation */}
          <Card className="p-6 border-border/60">
            <div className="mb-5">
              <h3 className="font-semibold">Phase 1: Binary Validation</h3>
              <p className="text-xs text-muted-foreground mt-1">Trash vs non-trash classification</p>
            </div>

            <div className="space-y-6">
              {/* Label Distribution */}
              <div>
                <p className="text-sm font-medium mb-3">Prediction Labels</p>
                <div className="h-[200px]">
                  {loading || phase1LabelData.length === 0 ? (
                    <div className="h-full w-full bg-muted/20 rounded-lg animate-pulse" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={phase1LabelData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label
                        >
                          {phase1LabelData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.name === "Valid Trash"
                                  ? COLORS.primary
                                  : entry.name === "Non-Trash"
                                  ? COLORS.danger
                                  : COLORS.slate
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Review Status */}
              <div>
                <p className="text-sm font-medium mb-3">Review Status Distribution</p>
                <div className="h-[180px]">
                  {loading || phase1ReviewData.length === 0 ? (
                    <div className="h-full w-full bg-muted/20 rounded-lg animate-pulse" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={phase1ReviewData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-15} textAnchor="end" height={60} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="value" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-lg font-bold">{phase1?.overrideRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Override Rate</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-lg font-bold">
                    {phase1?.labelDistribution
                      .find((l) => l._id === "trash")
                      ?.avgConfidence?.toFixed(2) || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Confidence</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Phase 2: Category Classification */}
          <Card className="p-6 border-border/60">
            <div className="mb-5">
              <h3 className="font-semibold">Phase 2: Category Classification</h3>
              <p className="text-xs text-muted-foreground mt-1">Waste category predictions</p>
            </div>

            <div className="space-y-6">
              {/* Predicted vs Final Comparison */}
              <div>
                <p className="text-sm font-medium mb-3">Predicted vs Final Categories</p>
                <div className="h-[200px]">
                  {loading || (predictedCategoryData.length === 0 && finalCategoryData.length === 0) ? (
                    <div className="h-full w-full bg-muted/20 rounded-lg animate-pulse" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={["glass", "mixed", "paper", "plastic"].map((cat) => ({
                          category: cat,
                          predicted:
                            predictedCategoryData.find((d) => d.category === cat)?.count || 0,
                          final: finalCategoryData.find((d) => d.category === cat)?.count || 0,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="predicted" fill={COLORS.secondary} radius={[4, 4, 0, 0]} name="Predicted" />
                        <Bar dataKey="final" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Final Reviewed" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Review Status */}
              <div>
                <p className="text-sm font-medium mb-3">Review Status Distribution</p>
                <div className="h-[180px]">
                  {loading || phase2ReviewData.length === 0 ? (
                    <div className="h-full w-full bg-muted/20 rounded-lg animate-pulse" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={phase2ReviewData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-15} textAnchor="end" height={60} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="value" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-lg font-bold">{phase2?.overrideRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Override Rate</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-lg font-bold">{phase2?.autoAcceptRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Auto-Accept Rate</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Weak Points Analysis */}
        <Card className="p-6 border-border/60">
          <div className="mb-5">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Category Weak Points Analysis
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Categories with high override rates or low confidence
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : weakPoints.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No weak point data available for this period
            </div>
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-center p-3 font-medium">Total</th>
                    <th className="text-center p-3 font-medium">Avg Confidence</th>
                    <th className="text-center p-3 font-medium">Override Rate</th>
                    <th className="text-center p-3 font-medium">Manual Review Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {weakPoints.map((cat, idx) => (
                    <tr key={cat.category} className={idx % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                      <td className="p-3">
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: CATEGORY_COLORS[cat.category] || COLORS.slate }}
                        />
                        <span className="capitalize font-medium">{cat.category}</span>
                      </td>
                      <td className="text-center p-3">{cat.totalPredictions}</td>
                      <td className="text-center p-3">
                        {cat.avgConfidence == null ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                            N/A
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              cat.avgConfidence >= 0.8
                                ? "bg-emerald-100 text-emerald-700"
                                : cat.avgConfidence >= 0.5
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {(cat.avgConfidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="text-center p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            cat.overrideRate > 20
                              ? "bg-red-100 text-red-700"
                              : cat.overrideRate > 10
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {cat.overrideRate}%
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <span className="text-muted-foreground">{cat.manualReviewRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
