import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VolunteerReportCard } from "./VolunteerReportCard";
import type { DashboardReport } from "@/types/dashboard";
import {
  applyReportFilters,
  uniqueWasteTypes,
  type ReportFilters,
  type SortOption,
} from "@/utils/volunteerFilters";

type FeedChip = "all" | "high" | "nearby";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  urgent: "Most urgent",
  nearest: "Nearest first",
};

interface AvailableReportsFeedProps {
  reports: DashboardReport[];
  actionLoading: string | null;
  onAccept: (id: string) => void;
  onOpenDetail: (report: DashboardReport) => void;
  userLat?: number;
  userLng?: number;
  locationGranted: boolean;
}

export function AvailableReportsFeed({
  reports,
  actionLoading,
  onAccept,
  onOpenDetail,
  userLat,
  userLng,
  locationGranted,
}: AvailableReportsFeedProps) {
  const [chip, setChip] = useState<FeedChip>("all");
  const [filters, setFilters] = useState<ReportFilters>({
    wasteType: "",
    urgency: "",
    sort: "newest",
    nearMe: false,
  });

  const wasteTypes = useMemo(() => uniqueWasteTypes(reports), [reports]);

  const activeFilters: ReportFilters = useMemo(() => {
    if (chip === "high") return { ...filters, urgency: "high", nearMe: false };
    if (chip === "nearby") return { ...filters, nearMe: true, urgency: "" };
    return { ...filters, nearMe: false };
  }, [chip, filters]);

  const filtered = useMemo(
    () => applyReportFilters(reports, activeFilters, userLat, userLng),
    [reports, activeFilters, userLat, userLng]
  );

  const chips: { key: FeedChip; label: string }[] = [
    { key: "all", label: "All Pending" },
    { key: "high", label: "High Urgency" },
    { key: "nearby", label: "Near Me" },
  ];

  return (
    <div className="glass-premium rounded-2xl border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl">Available Reports</h2>
          <span className="text-sm text-muted-foreground">
            {filtered.length} report{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap border-b border-border/50 pb-3">
          {chips.map((c) => {
            const isDisabled = c.key === "nearby" && !locationGranted;
            return (
              <button
                key={c.key}
                disabled={isDisabled}
                onClick={() => setChip(c.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  chip === c.key
                    ? "bg-primary/10 text-primary border-primary/30"
                    : isDisabled
                    ? "opacity-40 cursor-not-allowed border-border/30 text-muted-foreground"
                    : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
                title={isDisabled ? "Enable location to filter by proximity" : undefined}
              >
                {c.key === "nearby" && <MapPin className="w-3 h-3" />}
                {c.label}
                {isDisabled && " (location off)"}
              </button>
            );
          })}

          {/* Type filter */}
          {wasteTypes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs rounded-full">
                  {filters.wasteType || "Type"}
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
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs rounded-full ml-auto">
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
        </div>
      </div>

      {/* Feed */}
      <div className="p-4 space-y-3 max-h-[580px] overflow-y-auto overscroll-contain">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-muted-foreground"
            >
              <Inbox className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {chip === "nearby"
                  ? "No pending reports within 10 km of your location"
                  : chip === "high"
                  ? "No high urgency reports at the moment"
                  : "No available reports right now"}
              </p>
              {chip !== "all" && (
                <button
                  className="text-xs text-primary mt-2 underline underline-offset-2"
                  onClick={() => setChip("all")}
                >
                  Show all reports
                </button>
              )}
            </motion.div>
          ) : (
            filtered.map((report) => (
              <VolunteerReportCard
                key={report._id}
                report={report}
                actionLoading={actionLoading === report._id}
                onAccept={onAccept}
                onOpenDetail={onOpenDetail}
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
