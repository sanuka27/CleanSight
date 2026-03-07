import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WasteTypeStat } from "@/types/admin";

interface WasteTypeChartProps {
  data: WasteTypeStat[];
  loading?: boolean;
}

const COLORS: Record<string, string> = {
  general:      "hsl(var(--primary))",
  recyclable:   "#10b981",
  organic:      "#84cc16",
  construction: "#f59e0b",
  hazardous:    "#ef4444",
};

const FALLBACK_COLOR = "#94a3b8";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WasteTypeChart({ data, loading }: WasteTypeChartProps) {
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
        No data available
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d) => ({
    name: capitalize(d.wasteType),
    value: d.count,
    color: COLORS[d.wasteType] || FALLBACK_COLOR,
    pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [`${value} (${chartData.find(d => d.name === name)?.pct ?? 0}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-bold">{total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 justify-center">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-medium">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
