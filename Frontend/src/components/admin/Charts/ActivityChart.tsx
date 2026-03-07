import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TrendDataPoint } from "@/types/admin";

interface ActivityChartProps {
  data: TrendDataPoint[];
  loading?: boolean;
}

const COLORS = {
  total: "hsl(var(--primary))",
  resolved: "#10b981",
  pending: "#f59e0b",
};

export function ActivityChart({ data, loading }: ActivityChartProps) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No data for selected period
      </div>
    );
  }

  // Format date label
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.total} stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.total} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.resolved} stopOpacity={0.2} />
            <stop offset="95%" stopColor={COLORS.resolved} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-pending" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.pending} stopOpacity={0.2} />
            <stop offset="95%" stopColor={COLORS.pending} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.4}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
        <Area
          type="monotone"
          dataKey="total"
          name="Total"
          stroke={COLORS.total}
          strokeWidth={2.5}
          fill="url(#grad-total)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="resolved"
          name="Resolved"
          stroke={COLORS.resolved}
          strokeWidth={2.5}
          fill="url(#grad-resolved)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="pending"
          name="Pending"
          stroke={COLORS.pending}
          strokeWidth={2}
          fill="url(#grad-pending)"
          dot={false}
          activeDot={{ r: 4 }}
          strokeDasharray="4 4"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
