/**
 * ActivityFeedPage.tsx
 *
 * Full-screen admin activity feed with:
 *   - All event types (up to 200 in-memory)
 *   - Filter tabs: All / New Reports / Status Changes / AI Review / Assignments
 *   - Export current session feed to CSV
 *   - Live connection status + event counter
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  FileText,
  AlertTriangle,
  UserCheck,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useActivityFeed,
  type ActivityEvent,
  type ActivityEventType,
} from "@/hooks/useActivityFeed";

// ── Filter tabs ───────────────────────────────────────────────────────────────

type FilterTab = "all" | "reports" | "status" | "ai" | "assignments";

const FILTER_TABS: {
  id: FilterTab;
  label: string;
  icon: React.ElementType;
  types: ActivityEventType[];
}[] = [
  {
    id: "all",
    label: "All",
    icon: Radio,
    types: [
      "report_submitted",
      "status_changed",
      "report_assigned",
      "ai_review_complete",
      "report_resolved",
      "report_rejected",
    ],
  },
  {
    id: "reports",
    label: "New Reports",
    icon: FileText,
    types: ["report_submitted"],
  },
  {
    id: "status",
    label: "Status Changes",
    icon: AlertTriangle,
    types: ["status_changed", "report_resolved", "report_rejected"],
  },
  {
    id: "ai",
    label: "AI Review",
    icon: BrainCircuit,
    types: ["ai_review_complete"],
  },
  {
    id: "assignments",
    label: "Assignments",
    icon: UserCheck,
    types: ["report_assigned"],
  },
];

// ── Event type config ─────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  ActivityEventType,
  { icon: React.ElementType; colorClass: string; label: string }
> = {
  connected: {
    icon: Wifi,
    colorClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    label: "Connected",
  },
  report_submitted: {
    icon: FileText,
    colorClass: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
    label: "New Report",
  },
  status_changed: {
    icon: AlertTriangle,
    colorClass: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
    label: "Status Update",
  },
  report_assigned: {
    icon: UserCheck,
    colorClass: "text-violet-500 bg-violet-50 dark:bg-violet-950/40",
    label: "Assigned",
  },
  ai_review_complete: {
    icon: BrainCircuit,
    colorClass: "text-purple-500 bg-purple-50 dark:bg-purple-950/40",
    label: "AI Review",
  },
  report_resolved: {
    icon: CheckCircle2,
    colorClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    label: "Resolved",
  },
  report_rejected: {
    icon: XCircle,
    colorClass: "text-red-500 bg-red-50 dark:bg-red-950/40",
    label: "Rejected",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function exportCsv(events: ActivityEvent[]) {
  const headers = [
    "id",
    "type",
    "reportId",
    "title",
    "description",
    "actorUid",
    "previousStatus",
    "newStatus",
    "urgency",
    "wasteType",
    "timestamp",
  ];

  const esc = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = events.map((e) =>
    [
      e.id,
      e.type,
      e.reportId ?? "",
      e.title ?? "",
      e.description,
      e.actorUid ?? "",
      e.previousStatus ?? "",
      e.newStatus ?? "",
      e.urgency ?? "",
      e.wasteType ?? "",
      e.timestamp,
    ]
      .map(esc)
      .join(",")
  );

  const csv = [headers.map(esc).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity-feed-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Row component ─────────────────────────────────────────────────────────────

function FeedRow({ event }: { event: ActivityEvent }) {
  const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.status_changed;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
    >
      {/* Icon + type */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
            config.colorClass
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold w-28 leading-tight">
          {config.label}
        </span>
      </div>

      {/* Body */}
      <div className="min-w-0">
        <p className="text-sm text-foreground/90 leading-snug">
          {event.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {event.title && (
            <span className="text-xs text-muted-foreground italic truncate max-w-[280px]">
              "{event.title}"
            </span>
          )}
          {event.urgency && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-4 px-1.5 border font-medium capitalize",
                event.urgency === "high" &&
                  "border-red-300 text-red-600 bg-red-50 dark:bg-red-950/30",
                event.urgency === "medium" &&
                  "border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/30",
                event.urgency === "low" &&
                  "border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
              )}
            >
              {event.urgency}
            </Badge>
          )}
          {event.wasteType && (
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1.5 capitalize"
            >
              {event.wasteType}
            </Badge>
          )}
          {event.previousStatus && event.newStatus && (
            <span className="text-[10px] text-muted-foreground">
              {event.previousStatus} → {event.newStatus}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-right">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {relativeTime(event.timestamp)}
        </span>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {new Date(event.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ActivityFeedPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const { events, status, clearEvents } = useActivityFeed({ maxEvents: 200 });

  const activeFilter = FILTER_TABS.find((t) => t.id === activeTab)!;
  const filtered = useMemo(
    () => events.filter((e) => activeFilter.types.includes(e.type)),
    [events, activeFilter.types]
  );

  const isConnected = status === "connected";
  const isLoading =
    status === "connecting" || status === "reconnecting";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="border-b border-border/60 px-6 py-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                Live Activity Feed
              </h1>
              <p className="text-xs text-muted-foreground">
                Real-time report updates across all staff
              </p>
            </div>
          </div>

          {/* Status + actions */}
          <div className="flex items-center gap-2">
            {/* Connection pill */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                isConnected &&
                  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
                isLoading &&
                  "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
                status === "error" &&
                  "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
                status === "closed" &&
                  "border-border bg-muted text-muted-foreground"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isConnected ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {isConnected
                ? "Live"
                : isLoading
                  ? status === "reconnecting"
                    ? "Reconnecting…"
                    : "Connecting…"
                  : status === "error"
                    ? "Connection error"
                    : "Disconnected"}
            </div>

            <Badge variant="secondary" className="text-xs">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              disabled={events.length === 0}
              onClick={() => exportCsv(filtered)}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 text-muted-foreground"
              disabled={events.length === 0}
              onClick={clearEvents}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-4">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = events.filter((e) =>
              tab.types.includes(e.type)
            ).length;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/15 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 p-6">
        <Card className="border-border/60 overflow-hidden">
          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              {isLoading ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                  <p className="text-sm">Connecting to live feed…</p>
                </>
              ) : (
                <>
                  <Radio className="w-10 h-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium">No activity yet</p>
                  <p className="text-xs">
                    Events will appear here as reports are submitted and updated
                  </p>
                </>
              )}
            </div>
          )}

          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((event) => (
              <FeedRow key={event.id} event={event} />
            ))}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
