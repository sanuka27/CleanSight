import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  Image,
  ArrowRight,
  ExternalLink,
  Camera,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardReport } from "@/types/dashboard";
import { reportAge } from "@/utils/volunteerInsights";
import { CleanSightMap } from "@/components/map/CleanSightMap";
import type { MapReportMarker } from "@/types/map";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-info/10 text-info border-info/20",
  resolved: "bg-success/10 text-success border-success/20",
};

const urgencyColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted/20 text-muted-foreground border-border",
};

interface TaskDetailsModalProps {
  report: DashboardReport | null;
  open: boolean;
  onClose: () => void;
  actionLoading: boolean;
  canAccept?: boolean;
  canResolve?: boolean;
  onAccept?: (id: string) => void;
  /** Opens the resolve-with-photo modal instead of resolving directly */
  onOpenResolve?: (report: DashboardReport) => void;
  onOpenMap?: (report: DashboardReport) => void;
}

function StatusTimeline({ report }: { report: DashboardReport }) {
  const steps = useMemo(() => {
    const all = [
      { key: "pending", label: "Submitted", date: report.createdAt },
      ...(report.status === "assigned" || report.status === "resolved"
        ? [{ key: "assigned", label: "Assigned", date: report.updatedAt ?? report.createdAt }]
        : []),
      ...(report.status === "resolved"
        ? [{ key: "resolved", label: "Resolved", date: report.updatedAt ?? report.createdAt }]
        : []),
    ];
    return all;
  }, [report]);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-2 h-2 rounded-full ${
                step.key === "resolved"
                  ? "bg-success"
                  : step.key === "assigned"
                  ? "bg-info"
                  : "bg-warning"
              }`}
            />
          </div>
          <div
            className={`text-xs px-2 py-0.5 rounded-full ${statusColors[step.key] ?? ""}`}
          >
            {step.label}
            <span className="ml-1 opacity-60">
              {new Date(step.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          {i < steps.length - 1 && (
            <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
          )}
        </div>
      ))}
    </div>
  );
}

export function TaskDetailsModal({
  report,
  open,
  onClose,
  actionLoading,
  canAccept,
  canResolve,
  onAccept,
  onOpenResolve,
  onOpenMap,
}: TaskDetailsModalProps) {
  const mapMarker: MapReportMarker | null = useMemo(() => {
    if (!report?.location?.coordinates) return null;
    return {
      _id: report._id,
      description: report.description ?? "",
      status: report.status as MapReportMarker["status"],
      wasteType: report.wasteType,
      urgency: report.urgency,
      imageUrl: report.imageUrl,
      location: report.location,
      createdAt: report.createdAt,
    };
  }, [report]);

  const hasResolutionPhoto = !!report?.resolutionImageUrl;

  return (
    <AnimatePresence>
      {open && report && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="glass-premium border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusColors[report.status] ?? ""}`}
                  >
                    {report.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {report.wasteType}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${urgencyColors[report.urgency?.toLowerCase() ?? ""] ?? ""}`}
                  >
                    {report.urgency} urgency
                  </Badge>
                  {hasResolutionPhoto && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-success/10 text-success border-success/20 gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      Photo proof
                    </Badge>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Before photo */}
              <div className="relative">
                {report.imageUrl ? (
                  <img
                    src={report.imageUrl}
                    alt="Before"
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted/20 flex items-center justify-center">
                    <Image className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                {report.imageUrl && (
                  <span className="absolute bottom-2 left-3 text-[11px] bg-black/50 text-white px-2 py-0.5 rounded-md font-medium">
                    {hasResolutionPhoto ? "Before" : "Report photo"}
                  </span>
                )}
              </div>

              {/* After / Resolution photo */}
              {hasResolutionPhoto && (
                <div className="relative border-t border-border/30">
                  <img
                    src={report.resolutionImageUrl!}
                    alt="After cleanup"
                    className="w-full h-48 object-cover"
                  />
                  <span className="absolute bottom-2 left-3 text-[11px] bg-success/80 text-white px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    After cleanup
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Description */}
                <div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {report.description || report.title || "No description available"}
                  </p>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {new Date(report.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{reportAge(report.createdAt)}</span>
                  </div>
                  {report.location?.coordinates && (
                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="font-mono text-xs">
                        {report.location.coordinates[1].toFixed(5)},{" "}
                        {report.location.coordinates[0].toFixed(5)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Status Timeline
                  </p>
                  <StatusTimeline report={report} />
                </div>

                {/* Mini Map */}
                {mapMarker && (
                  <div className="rounded-xl overflow-hidden border border-border/40 h-[160px] relative">
                    <CleanSightMap
                      mode="view"
                      reports={[mapMarker]}
                      selectedId={report._id}
                      className="h-full w-full"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2 flex-wrap">
                  {canAccept && onAccept && report.status === "pending" && (
                    <Button
                      variant="outline"
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/10 flex-1"
                      disabled={actionLoading}
                      onClick={() => { onAccept(report._id); onClose(); }}
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Accept Task
                    </Button>
                  )}
                  {canResolve && onOpenResolve && report.status === "assigned" && (
                    <Button
                      className="gap-2 gradient-primary text-white flex-1"
                      disabled={actionLoading}
                      onClick={() => { onOpenResolve(report); onClose(); }}
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      Mark Resolved
                    </Button>
                  )}
                  {onOpenMap && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => { onOpenMap(report); onClose(); }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Google Maps
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
