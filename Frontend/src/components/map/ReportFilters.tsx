import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import {
  STATUS_FILTERS,
  STATUS_CONFIG,
  SORT_OPTIONS,
  type StatusFilterValue,
  type SortValue,
} from "@/constants/mapUi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportFiltersProps {
  statusFilter: StatusFilterValue;
  onStatusFilterChange: (status: StatusFilterValue) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortValue;
  onSortChange: (sort: SortValue) => void;
  statusCounts: Record<string, number>;
}

export function ReportFilters({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  statusCounts,
}: ReportFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Search + Sort row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <Input
            className="pl-9 h-9 text-sm bg-white/60 backdrop-blur-sm border-white/40 rounded-xl
                       focus:bg-white focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200
                       transition-all duration-200 placeholder:text-muted-foreground/40"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortValue)}>
          <SelectTrigger
            className="w-[130px] h-9 text-xs rounded-xl bg-white/60 backdrop-blur-sm
                       border-white/40 focus:ring-emerald-200"
          >
            <SlidersHorizontal className="w-3 h-3 mr-1.5 text-muted-foreground/60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((status) => {
          const count = statusCounts[status] ?? 0;
          const isActive = statusFilter === status;
          const label =
            status === "All"
              ? "All"
              : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label ?? status;

          return (
            <motion.div
              key={status}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Badge
                variant={isActive ? "default" : "outline"}
                className={`
                  cursor-pointer text-xs px-3 py-1 rounded-full transition-all duration-200
                  ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-md shadow-emerald-200/50"
                      : "bg-white/60 backdrop-blur-sm border-white/50 text-muted-foreground hover:bg-white hover:border-emerald-200 hover:text-emerald-700"
                  }
                `}
                onClick={() => onStatusFilterChange(status)}
              >
                {label}
                <span className={`ml-1 ${isActive ? "opacity-80" : "opacity-50"}`}>
                  {count}
                </span>
              </Badge>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
