import { useMemo } from "react";
import type { AdminMapReport } from "@/types/admin";

interface AdminMapStatsProps {
  reports: AdminMapReport[];
}

const STAT_CHIPS = [
  {
    key: "total",
    label: "Total",
    gradient: "from-slate-500 to-slate-600",
    filter: () => true,
  },
  {
    key: "pending",
    label: "Pending",
    gradient: "from-amber-500 to-orange-500",
    filter: (r: AdminMapReport) => r.status === "pending",
  },
  {
    key: "assigned",
    label: "Assigned",
    gradient: "from-blue-500 to-indigo-500",
    filter: (r: AdminMapReport) =>
      r.status === "assigned" || r.status === "in_progress",
  },
  {
    key: "resolved",
    label: "Resolved",
    gradient: "from-emerald-500 to-teal-500",
    filter: (r: AdminMapReport) => r.status === "resolved",
  },
] as const;

export function AdminMapStats({ reports }: AdminMapStatsProps) {
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    STAT_CHIPS.forEach((chip) => {
      result[chip.key] = reports.filter(chip.filter).length;
    });
    return result;
  }, [reports]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STAT_CHIPS.map((chip) => (
        <div
          key={chip.key}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${chip.gradient} text-white text-xs font-semibold shadow-sm`}
        >
          <span className="opacity-80">{chip.label}</span>
          <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] min-w-[20px] text-center font-bold">
            {counts[chip.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
