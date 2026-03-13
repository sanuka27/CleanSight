import { useState } from "react";
import {
  Search,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminMapFilters as Filters } from "@/types/admin";
import { motion, AnimatePresence } from "framer-motion";

interface AdminMapFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-amber-500" },
  { value: "verified", label: "Verified", color: "bg-sky-500" },
  { value: "assigned", label: "Assigned", color: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", color: "bg-violet-500" },
  { value: "resolved", label: "Resolved", color: "bg-emerald-500" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" },
];

const WASTE_TYPES = [
  { value: "general", label: "General" },
  { value: "recyclable", label: "Recyclable" },
  { value: "organic", label: "Organic" },
  { value: "construction", label: "Construction" },
  { value: "hazardous", label: "Hazardous" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low", icon: "🟢" },
  { value: "medium", label: "Medium", icon: "🟡" },
  { value: "high", label: "High", icon: "🔴" },
];

export function AdminMapFilters({ filters, onChange, onReset }: AdminMapFiltersProps) {
  const [expanded, setExpanded] = useState(true);

  const activeStatuses = filters.status ? filters.status.split(",") : [];

  function toggleStatus(status: string) {
    const current = new Set(activeStatuses);
    if (current.has(status)) current.delete(status);
    else current.add(status);
    onChange({
      ...filters,
      status: [...current].join(",") || undefined,
    });
  }

  const activeCount = [
    filters.status,
    filters.wasteType,
    filters.urgency,
    filters.unassigned,
    filters.dateFrom,
    filters.dateTo,
    filters.q,
  ].filter(Boolean).length;

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/60 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
          {activeCount > 0 && (
            <Badge
              variant="default"
              className="h-5 px-1.5 text-[10px] bg-primary/90 rounded-full"
            >
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm rounded-xl bg-muted/40 border-border/40"
                  placeholder="Search reports..."
                  value={filters.q || ""}
                  onChange={(e) =>
                    onChange({ ...filters, q: e.target.value || undefined })
                  }
                />
              </div>

              {/* Status pills */}
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Status
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = activeStatuses.includes(opt.value);
                    return (
                      <Badge
                        key={opt.value}
                        variant={active ? "default" : "outline"}
                        className={`cursor-pointer text-[11px] px-2.5 py-0.5 rounded-full transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/40"
                        }`}
                        onClick={() => toggleStatus(opt.value)}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${opt.color} mr-1.5 inline-block`} />
                        {opt.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Waste Type + Urgency row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Waste Type
                  </Label>
                  <Select
                    value={filters.wasteType || "all"}
                    onValueChange={(v) =>
                      onChange({ ...filters, wasteType: v === "all" ? undefined : v })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-muted/40 border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-xs">All types</SelectItem>
                      {WASTE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Urgency
                  </Label>
                  <Select
                    value={filters.urgency || "all"}
                    onValueChange={(v) =>
                      onChange({ ...filters, urgency: v === "all" ? undefined : v })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-muted/40 border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-xs">All urgencies</SelectItem>
                      {URGENCY_OPTIONS.map((u) => (
                        <SelectItem key={u.value} value={u.value} className="text-xs">
                          {u.icon} {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    From
                  </Label>
                  <Input
                    type="date"
                    className="h-9 text-xs rounded-xl bg-muted/40 border-border/40"
                    value={filters.dateFrom || ""}
                    onChange={(e) =>
                      onChange({ ...filters, dateFrom: e.target.value || undefined })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    To
                  </Label>
                  <Input
                    type="date"
                    className="h-9 text-xs rounded-xl bg-muted/40 border-border/40"
                    value={filters.dateTo || ""}
                    onChange={(e) =>
                      onChange({ ...filters, dateTo: e.target.value || undefined })
                    }
                  />
                </div>
              </div>

              {/* Unassigned toggle */}
              <div className="flex items-center justify-between py-1">
                <Label className="text-xs text-muted-foreground cursor-pointer">
                  Only unassigned
                </Label>
                <Switch
                  checked={filters.unassigned ?? false}
                  onCheckedChange={(v) =>
                    onChange({ ...filters, unassigned: v || undefined })
                  }
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
