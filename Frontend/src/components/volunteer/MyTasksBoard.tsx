import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  ClipboardX,
  CheckCircle2,
  Clock4,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VolunteerTaskCard } from "./VolunteerTaskCard";
import type { DashboardReport } from "@/types/dashboard";
import {
  applyTaskFilters,
  uniqueWasteTypes,
  type TaskFilters,
  type SortOption,
} from "@/utils/volunteerFilters";

type TaskTab = "assigned" | "resolved";

interface MyTasksBoardProps {
  assignedToMe: DashboardReport[];
  resolvedByMe: DashboardReport[];
  actionLoading: string | null;
  /** Opens the resolve-with-photo modal */
  onOpenResolve: (report: DashboardReport) => void;
  onOpenDetail: (report: DashboardReport) => void;
  onOpenMap: (report: DashboardReport) => void;
  userLat?: number;
  userLng?: number;
}

const sortLabels: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  urgent: "Most urgent",
  nearest: "Nearest first",
};

export function MyTasksBoard({
  assignedToMe,
  resolvedByMe,
  actionLoading,
  onOpenResolve,
  onOpenDetail,
  onOpenMap,
  userLat,
  userLng,
}: MyTasksBoardProps) {
  const [tab, setTab] = useState<TaskTab>("assigned");
  const [filters, setFilters] = useState<TaskFilters>({
    search: "",
    wasteType: "",
    urgency: "",
    sort: "newest",
  });

  const source = tab === "assigned" ? assignedToMe : resolvedByMe;
  const wasteTypes = useMemo(
    () => uniqueWasteTypes([...assignedToMe, ...resolvedByMe]),
    [assignedToMe, resolvedByMe]
  );

  const filtered = useMemo(
    () => applyTaskFilters(source, filters, userLat, userLng),
    [source, filters, userLat, userLng]
  );

  const tabs: { key: TaskTab; label: string; count: number; icon: React.ComponentType<{className?: string}> }[] = [
    { key: "assigned", label: "Assigned", count: assignedToMe.length, icon: Clock4 },
    { key: "resolved", label: "Resolved", count: resolvedByMe.length, icon: CheckCircle2 },
  ];

  return (
    <div className="glass-premium rounded-2xl border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-0">
        <h2 className="font-display font-bold text-xl mb-4">My Tasks</h2>

        {/* Tabs */}
        <div className="flex border-b border-border/50 mb-0 gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.key
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-border/30 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search tasks…"
            className="pl-8 h-8 text-sm bg-background/50"
          />
        </div>

        {wasteTypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                {filters.wasteType || "Waste type"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilters((f) => ({ ...f, wasteType: "" }))}>
                All types
              </DropdownMenuItem>
              {wasteTypes.map((wt) => (
                <DropdownMenuItem
                  key={wt}
                  onClick={() => setFilters((f) => ({ ...f, wasteType: wt }))}
                  className="capitalize"
                >
                  {wt}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              {filters.urgency || "Urgency"}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilters((f) => ({ ...f, urgency: "" }))}>
              All
            </DropdownMenuItem>
            {["high", "medium", "low"].map((u) => (
              <DropdownMenuItem
                key={u}
                onClick={() => setFilters((f) => ({ ...f, urgency: u }))}
                className="capitalize"
              >
                {u}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              {sortLabels[filters.sort]}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(Object.keys(sortLabels) as SortOption[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setFilters((f) => ({ ...f, sort: s }))}
              >
                {sortLabels[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {(filters.search || filters.wasteType || filters.urgency || filters.sort !== "newest") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setFilters({ search: "", wasteType: "", urgency: "", sort: "newest" })}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Task list */}
      <div className="p-4 space-y-3 max-h-[580px] overflow-y-auto overscroll-contain">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
            >
              <ClipboardX className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {tab === "assigned"
                  ? filters.search || filters.wasteType || filters.urgency
                    ? "No tasks match your filters"
                    : "No active tasks assigned to you"
                  : filters.search || filters.wasteType || filters.urgency
                  ? "No resolved tasks match your filters"
                  : "No resolved tasks yet"}
              </p>
              {tab === "assigned" && !filters.search && !filters.wasteType && (
                <p className="text-xs mt-1">Accept reports from the Available section below</p>
              )}
            </motion.div>
          ) : (
            filtered.map((report) => (
              <VolunteerTaskCard
                key={report._id}
                report={report}
                actionLoading={actionLoading === report._id}
                onOpenResolve={onOpenResolve}
                onOpenDetail={onOpenDetail}
                onOpenMap={onOpenMap}
                userLat={userLat}
                userLng={userLng}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
