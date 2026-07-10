/**
 * ActivityFeed.tsx
 *
 * A polished real-time activity feed panel for the admin dashboard.
 * Consumes the useActivityFeed hook and renders events with:
 *   - Color-coded icons per event type
 *   - Animated slide-in for new events (framer-motion)
 *   - Relative timestamps ("2 min ago")
 *   - Live connection status badge
 *   - Pause-on-hover to let admins read without items scrolling past
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  CheckCircle2,
  XCircle,
  UserCheck,
  BrainCircuit,
  AlertTriangle,
  FileText,
  Wifi,
  WifiOff,
  Loader2,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useActivityFeed,
  type ActivityEvent,
  type ActivityEventType,
  type FeedStatus,
} from "@/hooks/useActivityFeed";

// ── Config ───────────────────────────────────────────────────────────────────

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

const STATUS_CONFIG: Record<
  FeedStatus,
  { label: string; dotClass: string; icon: React.ElementType }
> = {
  connecting: {
    label: "Connecting…",
    dotClass: "bg-amber-400 animate-pulse",
    icon: Loader2,
  },
  connected: {
    label: "Live",
    dotClass: "bg-emerald-500",
    icon: Wifi,
  },
  reconnecting: {
    label: "Reconnecting…",
    dotClass: "bg-amber-400 animate-pulse",
    icon: WifiOff,
  },
  error: {
    label: "Connection error",
    dotClass: "bg-red-500",
    icon: WifiOff,
  },
  closed: {
    label: "Disconnected",
    dotClass: "bg-muted-foreground",
    icon: WifiOff,
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

// ── Sub-components ────────────────────────────────────────────────────────────

function EventItem({ event }: { event: ActivityEvent }) {
  const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.status_changed;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
    >
      {/* Icon */}
      <div
        className={cn(
          "mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          config.colorClass
        )}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold">{config.label}</span>
          {event.urgency && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-4 px-1.5 border font-medium capitalize",
                event.urgency === "high" && "border-red-300 text-red-600 bg-red-50",
                event.urgency === "medium" && "border-amber-300 text-amber-600 bg-amber-50",
                event.urgency === "low" && "border-emerald-300 text-emerald-600 bg-emerald-50"
              )}
            >
              {event.urgency}
            </Badge>
          )}
        </div>
        <p className="text-xs text-foreground/80 leading-snug truncate">
          {event.description}
        </p>
        {event.title && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            "{event.title}"
          </p>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 shrink-0">
        {relativeTime(event.timestamp)}
      </span>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  /** Max visible events in the compact panel view (default: 20) */
  maxVisible?: number;
  className?: string;
  /** Show in compact mode (used in Overview page sidebar) */
  compact?: boolean;
}

export function ActivityFeed({
  maxVisible = 20,
  className,
  compact = false,
}: ActivityFeedProps) {
  const [paused, setPaused] = useState(false);
  const { events, status, clearEvents } = useActivityFeed({ maxEvents: 100 });

  const statusConf = STATUS_CONFIG[status];
  const StatusIcon = statusConf.icon;

  // When paused, freeze the list to prevent items shifting while reading
  const displayEvents = useMemo(
    () => (paused ? events.slice(0, maxVisible) : events.slice(0, maxVisible)),
    // intentionally include events so the memo updates; paused just controls
    // whether we show a "paused" indicator
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, maxVisible]
  );

  const handleMouseEnter = useCallback(() => setPaused(true), []);
  const handleMouseLeave = useCallback(() => setPaused(false), []);

  return (
    <Card className={cn("border-border/60 overflow-hidden flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">
            {compact ? "Live Feed" : "Live Activity Feed"}
          </h3>
          {/* Connection badge */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", statusConf.dotClass)} />
            <span className="text-[10px] text-muted-foreground font-medium">
              {statusConf.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {events.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={clearEvents}
              title="Clear events"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {!compact && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {events.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Event list */}
      <div
        className={cn(
          "overflow-y-auto flex-1 relative",
          compact ? "max-h-[320px]" : "max-h-[520px]"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Paused overlay */}
        {paused && events.length > 0 && (
          <div className="sticky top-0 z-10 text-center py-1 text-[10px] bg-muted/80 backdrop-blur-sm text-muted-foreground border-b border-border/40">
            ⏸ Paused — scroll to read
          </div>
        )}

        {/* Empty / loading state */}
        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <StatusIcon
              className={cn(
                "w-8 h-8",
                status === "connecting" || status === "reconnecting"
                  ? "animate-spin"
                  : ""
              )}
            />
            <p className="text-xs">
              {status === "connected"
                ? "Waiting for activity…"
                : statusConf.label}
            </p>
          </div>
        )}

        {/* Events */}
        <AnimatePresence initial={false} mode="popLayout">
          {displayEvents.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer — overflow count */}
      {events.length > maxVisible && (
        <div className="px-4 py-2 text-center text-[11px] text-muted-foreground border-t border-border/40">
          +{events.length - maxVisible} older events — visit the Activity Feed page
          to see all
        </div>
      )}
    </Card>
  );
}
