import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  updateReportStatus,
  assignReportToVolunteer,
  getAdminReport,
} from "@/services/admin";
import type { AdminReport, AdminVolunteer, ReportStatus } from "@/types/admin";
import type { AdminMapReport } from "@/types/admin";
import { cn } from "@/lib/utils";

interface AdminReportDrawerProps {
  /** Lightweight report from map — used to render immediately while full data loads */
  mapReport: AdminMapReport | null;
  volunteers: AdminVolunteer[];
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; color: string; bg: string }
> = {
  pending:     { label: "Pending",     color: "text-amber-600",   bg: "bg-amber-100 text-amber-700 border-amber-200" },
  verified:    { label: "Verified",    color: "text-sky-600",     bg: "bg-sky-100 text-sky-700 border-sky-200" },
  assigned:    { label: "Assigned",    color: "text-blue-600",    bg: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", color: "text-violet-600",  bg: "bg-violet-100 text-violet-700 border-violet-200" },
  resolved:    { label: "Resolved",    color: "text-emerald-600", bg: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected:    { label: "Rejected",    color: "text-red-600",     bg: "bg-red-100 text-red-700 border-red-200" },
};

const URGENCY_CONFIG = {
  low:    { label: "Low",    icon: "🟢" },
  medium: { label: "Medium", icon: "🟡" },
  high:   { label: "High",   icon: "🔴" },
};

const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending:     ["verified", "assigned", "rejected"],
  verified:    ["assigned", "rejected"],
  assigned:    ["in_progress", "resolved", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved:    [],
  rejected:    ["pending"],
};

export function AdminReportDrawer({
  mapReport,
  volunteers,
  onClose,
  onUpdated,
}: AdminReportDrawerProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>("");
  const [fullReport, setFullReport] = useState<AdminReport | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load full report details when mapReport changes
  useEffect(() => {
    if (!mapReport) {
      setFullReport(null);
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);
    getAdminReport(mapReport._id)
      .then((res) => {
        if (!cancelled) setFullReport(res.data);
      })
      .catch(() => {
        // Fallback: keep using map report data
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });
    return () => { cancelled = true; };
  }, [mapReport?._id]);

  if (!mapReport) return null;

  // Use full report if available, otherwise map report for basic fields
  const report = fullReport || mapReport;
  const status = report.status;
  const allowedNext = ALLOWED_TRANSITIONS[status];
  const statusCfg = STATUS_CONFIG[status];
  const urgencyCfg = URGENCY_CONFIG[report.urgency as keyof typeof URGENCY_CONFIG] || URGENCY_CONFIG.medium;
  const coords = report.location?.coordinates;
  const lat = coords?.[1];
  const lng = coords?.[0];

  async function handleStatusChange(newStatus: ReportStatus) {
    if (saving) return;
    setSaving(true);
    try {
      await updateReportStatus(
        mapReport!._id,
        newStatus,
        newStatus === "rejected" ? rejectionReason : undefined
      );
      toast({ title: "Status updated", description: `Report marked as ${newStatus}.` });
      setRejectionReason("");
      onUpdated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update status";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    if (!selectedVolunteer || saving) return;
    setSaving(true);
    try {
      await assignReportToVolunteer(mapReport!._id, selectedVolunteer);
      toast({ title: "Volunteer assigned", description: "Report has been assigned." });
      setSelectedVolunteer("");
      onUpdated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to assign";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-[380px] shrink-0 bg-card border-l border-border/60 flex flex-col overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border/60 gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={cn("border font-medium text-[11px]", statusCfg.bg)}>
                {statusCfg.label}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {urgencyCfg.icon} {urgencyCfg.label}
              </span>
              {loadingDetails && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <h2 className="font-semibold text-sm leading-snug line-clamp-2">
              {report.title || (report as AdminMapReport).description?.slice(0, 60) || "Untitled Report"}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(report.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Image */}
          {(report as AdminReport).imageUrl && (
            <div className="rounded-xl overflow-hidden border border-border/60 h-40">
              <img
                src={(report as AdminReport).imageUrl}
                alt="Report"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Description */}
          {(fullReport?.description || (report as AdminMapReport).description) && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Description
              </h4>
              <p className="text-xs leading-relaxed text-foreground/80">
                {fullReport?.description || (report as AdminMapReport).description}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2">
            <MetaItem icon={AlertTriangle} label="Waste Type" value={report.wasteType} />
            <MetaItem
              icon={Clock}
              label="Updated"
              value={
                fullReport?.updatedAt
                  ? new Date(fullReport.updatedAt).toLocaleDateString()
                  : new Date(report.createdAt).toLocaleDateString()
              }
            />
            {fullReport?.reporter && (
              <MetaItem
                icon={User}
                label="Reporter"
                value={fullReport.reporter.name || fullReport.reporter.email}
              />
            )}
            {(fullReport?.assignedVolunteer || mapReport.assignedVolunteer) && (
              <MetaItem
                icon={CheckCircle}
                label="Assigned To"
                value={
                  fullReport?.assignedVolunteer?.name ||
                  mapReport.assignedVolunteer?.name ||
                  "Volunteer"
                }
              />
            )}
          </div>

          {/* Location */}
          {lat !== undefined && lng !== undefined && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Location
              </h4>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline ml-auto"
                >
                  OSM <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Admin note */}
          {fullReport?.adminNote && (
            <div className="bg-muted/50 rounded-xl p-3 border border-border/60">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">ADMIN NOTE</p>
              <p className="text-xs">{fullReport.adminNote}</p>
            </div>
          )}

          {/* Rejection reason */}
          {fullReport?.rejectionReason && (
            <div className="bg-red-50 rounded-xl p-3 border border-red-200">
              <p className="text-[10px] font-semibold text-red-600 mb-1">REJECTION REASON</p>
              <p className="text-xs text-red-700">{fullReport.rejectionReason}</p>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="space-y-3 pt-1">
            {/* Status transitions */}
            {allowedNext.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Change Status
                </h4>
                {allowedNext.includes("rejected") && (
                  <Textarea
                    placeholder="Rejection reason (required to reject)…"
                    rows={2}
                    className="text-xs resize-none mb-2 rounded-xl"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                )}
                <div className="flex flex-wrap gap-1.5">
                  {allowedNext.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const isReject = s === "rejected";
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant={isReject ? "destructive" : "outline"}
                        className={cn(
                          "h-7 text-[11px] gap-1 rounded-lg",
                          !isReject && "border-border"
                        )}
                        onClick={() => handleStatusChange(s)}
                        disabled={saving || (isReject && rejectionReason.trim().length < 5)}
                      >
                        {saving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isReject ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assign volunteer */}
            {status !== "resolved" && status !== "rejected" && (
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Assign Volunteer
                </h4>
                <div className="flex gap-2">
                  <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
                    <SelectTrigger className="flex-1 h-8 text-xs rounded-lg">
                      <SelectValue placeholder="Select volunteer…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {volunteers.map((v) => (
                        <SelectItem
                          key={v.firebaseUid}
                          value={v.firebaseUid}
                          className="text-xs"
                        >
                          {v.name} ({v.stats.resolved} resolved)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 text-xs rounded-lg"
                    onClick={handleAssign}
                    disabled={!selectedVolunteer || saving}
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
          {label}
        </p>
        <p className="text-xs font-medium truncate capitalize">{value}</p>
      </div>
    </div>
  );
}
