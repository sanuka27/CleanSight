/* ------------------------------------------------------------------ */
/*  Report Details Modal — shows full report info from real data       */
/* ------------------------------------------------------------------ */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRightCircle,
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  Tag,
  Loader2,
} from "lucide-react";
import {
  getStatusConfig,
  WASTE_TYPE_LABELS,
  URGENCY_LABELS,
  getLatLng,
} from "@/utils/reportStatus";
import { getTimeAgo } from "@/utils/reportInsights";
import type { DashboardReport } from "@/types/dashboard";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

/* ── Types ───────────────────────────────────────────────────────── */

interface ReportDetailsModalProps {
  report: DashboardReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusTimelineIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  assigned: <ArrowRightCircle className="w-4 h-4" />,
  resolved: <CheckCircle2 className="w-4 h-4" />,
};

/* ── Component ───────────────────────────────────────────────────── */

export function ReportDetailsModal({
  report,
  open,
  onOpenChange,
}: ReportDetailsModalProps) {
  const navigate = useNavigate();
  const [fullReport, setFullReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch full report details when modal opens
  useEffect(() => {
    if (!open || !report?._id) {
      setFullReport(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .getReportById(report._id)
      .then((res) => {
        if (!cancelled) setFullReport(res.data);
      })
      .catch(() => {
        // Fall back to the dashboard report data we already have
        if (!cancelled) setFullReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, report?._id]);

  if (!report) return null;

  // Use enriched data if available, fall back to dashboard data
  const data = fullReport || report;
  const statusConfig = getStatusConfig(data.status);
  const loc = getLatLng(data.location);

  const handleOpenOnMap = () => {
    if (loc) {
      navigate(`/map?lat=${loc.lat}&lng=${loc.lng}&reportId=${report._id}`);
      onOpenChange(false);
    }
  };

  // Build a simple timeline from createdAt / updatedAt and current status
  const timeline = buildTimeline(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-premium border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-3">
            Report Details
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full details of your waste report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Image */}
          {data.imageUrl ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-xl overflow-hidden ring-1 ring-white/10 aspect-video"
            >
              <img
                src={data.imageUrl}
                alt="Report image"
                className="w-full h-full object-cover"
              />
            </motion.div>
          ) : (
            <div className="rounded-xl bg-muted/10 flex items-center justify-center aspect-video ring-1 ring-white/10">
              <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
            </div>
          )}

          {/* Status, Type, Urgency badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`${statusConfig.badgeClass} text-xs font-medium px-2.5 py-1`}
            >
              <span
                className={`w-2 h-2 rounded-full ${statusConfig.dotClass} mr-2 inline-block`}
              />
              {statusConfig.label}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs border-border/50 text-muted-foreground px-2.5 py-1"
            >
              <Tag className="w-3 h-3 mr-1.5" />
              {WASTE_TYPE_LABELS[data.wasteType] || data.wasteType}
            </Badge>
            {data.urgency && (
              <Badge
                variant="outline"
                className="text-xs border-border/50 text-muted-foreground px-2.5 py-1"
              >
                {data.urgency === "high" ? (
                  <AlertCircle className="w-3 h-3 mr-1.5 text-destructive" />
                ) : data.urgency === "medium" ? (
                  <Clock className="w-3 h-3 mr-1.5 text-warning" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 mr-1.5 text-success" />
                )}
                {URGENCY_LABELS[data.urgency] || data.urgency}
              </Badge>
            )}
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            {data.title && (
              <h3 className="font-display font-bold text-lg">{data.title}</h3>
            )}
            <p className="text-sm text-foreground/80 leading-relaxed">
              {data.description || "No description provided."}
            </p>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Submitted time */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/5 border border-white/5">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm font-medium">
                  {new Date(data.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {new Date(data.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Last updated */}
            {data.updatedAt && data.updatedAt !== data.createdAt && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/5 border border-white/5">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">
                    {getTimeAgo(data.updatedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {new Date(data.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Location */}
            {loc && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/5 border border-white/5 sm:col-span-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">
                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenOnMap}
                  className="gap-1.5 h-8 text-xs border-white/10"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open on Map
                </Button>
              </div>
            )}

            {/* Assignment info */}
            {data.assignedTo && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/5 border border-white/5 sm:col-span-2">
                <ArrowRightCircle className="w-4 h-4 text-info mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="text-sm font-medium text-info">
                    Volunteer assigned
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Timeline
              </h4>
              <div className="relative pl-6">
                {/* Line */}
                <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border/50" />

                <div className="space-y-4">
                  {timeline.map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="relative flex items-start gap-3"
                    >
                      <div
                        className={`absolute -left-6 p-1 rounded-full ring-2 ring-background ${event.bgClass} ${event.textClass}`}
                      >
                        {statusTimelineIcons[event.status] || (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(event.date).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Timeline builder ────────────────────────────────────────────── */

interface TimelineEvent {
  status: string;
  label: string;
  date: string;
  bgClass: string;
  textClass: string;
}

function buildTimeline(data: DashboardReport): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Created
  if (data.createdAt) {
    const config = getStatusConfig("pending");
    events.push({
      status: "pending",
      label: "Report submitted",
      date: data.createdAt,
      bgClass: config.bgClass,
      textClass: config.textClass,
    });
  }

  // If assigned and updated is different from created
  if (
    data.status === "assigned" &&
    data.updatedAt &&
    data.updatedAt !== data.createdAt
  ) {
    const config = getStatusConfig("assigned");
    events.push({
      status: "assigned",
      label: "Assigned to volunteer",
      date: data.updatedAt,
      bgClass: config.bgClass,
      textClass: config.textClass,
    });
  }

  // If resolved
  if (data.status === "resolved") {
    // Show assigned step if we can infer it happened
    if (data.assignedTo) {
      const config = getStatusConfig("assigned");
      events.push({
        status: "assigned",
        label: "Assigned to volunteer",
        date: data.createdAt, // We don't have exact assignment time
        bgClass: config.bgClass,
        textClass: config.textClass,
      });
    }
    if (data.updatedAt) {
      const config = getStatusConfig("resolved");
      events.push({
        status: "resolved",
        label: "Report resolved",
        date: data.updatedAt,
        bgClass: config.bgClass,
        textClass: config.textClass,
      });
    }
  }

  return events;
}
