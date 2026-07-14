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
  Camera,
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
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-background border border-border shadow-2xl rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
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

        <div className="space-y-5 px-6 pb-6">
          {/* ── Photo section ───────────────────────────────────────── */}
          {data.resolutionImageUrl ? (
            /* Side-by-side BEFORE / AFTER when volunteer uploaded proof */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {/* Column labels */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold uppercase tracking-wider border border-orange-200">
                    <ImageIcon className="w-3 h-3" />
                    Before
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-bold uppercase tracking-wider border border-success/25">
                    <Camera className="w-3 h-3" />
                    After cleanup
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-success font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
              </div>

              {/* Side-by-side photos */}
              <div className="grid grid-cols-2 gap-3">
                {/* Before */}
                <div className="relative rounded-xl overflow-hidden ring-2 ring-orange-300/60 aspect-square">
                  {data.imageUrl ? (
                    <img
                      src={data.imageUrl}
                      alt="Before cleanup"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[11px] font-bold text-white bg-orange-500/80 px-2 py-0.5 rounded-md">
                    BEFORE
                  </span>
                </div>

                {/* After */}
                <div className="relative rounded-xl overflow-hidden ring-2 ring-success/50 aspect-square">
                  <img
                    src={data.resolutionImageUrl}
                    alt="After cleanup"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[11px] font-bold text-white bg-success/80 px-2 py-0.5 rounded-md">
                    AFTER
                  </span>
                </div>
              </div>

              {/* Trust caption */}
              <p className="text-center text-xs text-muted-foreground pt-0.5">
                📸 Volunteer uploaded proof of cleanup
              </p>
            </motion.div>
          ) : (
            /* Single report photo — no after photo yet */
            data.imageUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-xl overflow-hidden ring-1 ring-border aspect-video"
              >
                <img
                  src={data.imageUrl}
                  alt="Report image"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ) : (
              <div className="rounded-xl bg-muted flex items-center justify-center aspect-video">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              </div>
            )
          )}

          {/* Status, Type, Urgency badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`${statusConfig.badgeClass} text-xs font-semibold px-2.5 py-1`}
            >
              <span
                className={`w-2 h-2 rounded-full ${statusConfig.dotClass} mr-2 inline-block`}
              />
              {statusConfig.label}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs font-medium border-border text-foreground px-2.5 py-1"
            >
              <Tag className="w-3 h-3 mr-1.5 text-muted-foreground" />
              {WASTE_TYPE_LABELS[data.wasteType] || data.wasteType}
            </Badge>
            {data.urgency && (
              <Badge
                variant="outline"
                className="text-xs font-medium border-border text-foreground px-2.5 py-1"
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
          <div className="space-y-1.5">
            {data.title && (
              <h3 className="font-display font-bold text-lg">{data.title}</h3>
            )}
            <p className="text-sm text-foreground leading-relaxed">
              {data.description || "No description provided."}
            </p>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Submitted time */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50 border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  {new Date(data.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(data.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* Last updated */}
            {data.updatedAt && data.updatedAt !== data.createdAt && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50 border border-border">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-info" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Updated</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {getTimeAgo(data.updatedAt)}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
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
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 border border-border sm:col-span-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</p>
                  <p className="text-sm font-bold text-foreground mt-0.5 font-mono">
                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenOnMap}
                  className="gap-1.5 h-9 text-xs font-semibold border-border hover:bg-primary hover:text-white hover:border-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open on Map
                </Button>
              </div>
            )}

            {/* Assignment info */}
            {data.assignedTo && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-info/5 border border-info/20 sm:col-span-2">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                  <ArrowRightCircle className="w-4 h-4 text-info" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned To</p>
                  <p className="text-sm font-bold text-info mt-0.5">
                    Volunteer assigned
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="space-y-3 pt-1">
              <h4 className="text-sm font-bold text-foreground">
                Timeline
              </h4>
              <div className="relative pl-7">
                {/* Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border rounded-full" />

                <div className="space-y-5">
                  {timeline.map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="relative flex items-start gap-3"
                    >
                      <div
                        className={`absolute -left-7 p-1.5 rounded-full ring-2 ring-background ${event.bgClass} ${event.textClass}`}
                      >
                        {statusTimelineIcons[event.status] || (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{event.label}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
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
