import { useState } from "react";
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
  Send,
  ExternalLink,
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
  addReportNote,
} from "@/services/admin";
import type { AdminReport, AdminVolunteer, ReportStatus } from "@/types/admin";
import { cn } from "@/lib/utils";

interface ReportDrawerProps {
  report: AdminReport | null;
  volunteers: AdminVolunteer[];
  onClose: () => void;
  onUpdated: (report: AdminReport) => void;
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
  low:    { label: "Low",    color: "text-emerald-600", icon: "🟢" },
  medium: { label: "Medium", color: "text-amber-600",   icon: "🟡" },
  high:   { label: "High",   color: "text-red-600",     icon: "🔴" },
};

const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending:     ["verified", "assigned", "rejected"],
  verified:    ["assigned", "rejected"],
  assigned:    ["in_progress", "resolved", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved:    [],
  rejected:    ["pending"],
};

export function ReportDrawer({ report, volunteers, onClose, onUpdated }: ReportDrawerProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>("");

  if (!report) return null;

  const allowedNext = ALLOWED_TRANSITIONS[report.status];
  const statusCfg = STATUS_CONFIG[report.status];
  const urgencyCfg = URGENCY_CONFIG[report.urgency];
  const coords = report.location?.coordinates;
  const lat = coords?.[1];
  const lng = coords?.[0];

  async function handleStatusChange(newStatus: ReportStatus) {
    if (saving) return;
    setSaving(true);
    try {
      const res = await updateReportStatus(
        report!._id,
        newStatus,
        newStatus === "rejected" ? rejectionReason : undefined
      );
      onUpdated(res.data);
      toast({ title: "Status updated", description: `Report marked as ${newStatus}.` });
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
      const res = await assignReportToVolunteer(report!._id, selectedVolunteer);
      onUpdated(res.data);
      toast({ title: "Volunteer assigned", description: "Report has been assigned." });
      setSelectedVolunteer("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to assign";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNote() {
    if (!note.trim() || saving) return;
    setSaving(true);
    try {
      const res = await addReportNote(report!._id, note.trim());
      onUpdated(res.data);
      toast({ title: "Note saved" });
      setNote("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save note";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative ml-auto w-full max-w-lg bg-background shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border/60 gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge className={cn("border font-medium text-xs", statusCfg.bg)}>
                  {statusCfg.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {urgencyCfg.icon} {urgencyCfg.label} urgency
                </span>
              </div>
              <h2 className="font-semibold text-base leading-snug truncate">
                {report.title || report.description.slice(0, 60)}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(report.createdAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Image */}
            {report.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-border/60 h-48">
                <img
                  src={report.imageUrl}
                  alt="Report"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
              <p className="text-sm leading-relaxed">{report.description}</p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <MetaItem icon={AlertTriangle} label="Waste Type" value={report.wasteType} />
              <MetaItem icon={Clock} label="Updated" value={new Date(report.updatedAt).toLocaleDateString()} />
              {report.reporter && (
                <MetaItem icon={User} label="Reporter" value={report.reporter.name || report.reporter.email} />
              )}
              {report.assignedVolunteer && (
                <MetaItem icon={CheckCircle} label="Assigned To" value={report.assignedVolunteer.name || "Volunteer"} />
              )}
            </div>

            {/* Location */}
            {lat !== undefined && lng !== undefined && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Location</h4>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-auto"
                  >
                    Open Map <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Admin note */}
            {report.adminNote && (
              <div className="bg-muted/50 rounded-xl p-3 border border-border/60">
                <p className="text-xs font-semibold text-muted-foreground mb-1">ADMIN NOTE</p>
                <p className="text-sm">{report.adminNote}</p>
              </div>
            )}

            {/* Rejection reason */}
            {report.rejectionReason && (
              <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                <p className="text-xs font-semibold text-red-600 mb-1">REJECTION REASON</p>
                <p className="text-sm text-red-700">{report.rejectionReason}</p>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="space-y-4">
              {/* Status transitions */}
              {allowedNext.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Change Status</h4>
                  {allowedNext.includes("rejected") && (
                    <div className="mb-2">
                      <Textarea
                        placeholder="Rejection reason (optional)…"
                        rows={2}
                        className="text-sm resize-none mb-2"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {allowedNext.map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      const isReject = s === "rejected";
                      return (
                        <Button
                          key={s}
                          size="sm"
                          variant={isReject ? "destructive" : "outline"}
                          className={cn(!isReject && "border-border", "gap-1.5")}
                          onClick={() => handleStatusChange(s)}
                          disabled={saving}
                        >
                          {isReject ? <XCircle className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {cfg.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assign volunteer */}
              {report.status !== "resolved" && report.status !== "rejected" && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Assign Volunteer</h4>
                  <div className="flex gap-2">
                    <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
                      <SelectTrigger className="flex-1 h-9 text-sm">
                        <SelectValue placeholder="Select volunteer…" />
                      </SelectTrigger>
                      <SelectContent>
                        {volunteers.map((v) => (
                          <SelectItem key={v.firebaseUid} value={v.firebaseUid}>
                            {v.name} ({v.stats.resolved} resolved)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={handleAssign}
                      disabled={!selectedVolunteer || saving}
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              )}

              {/* Admin note */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Add Note</h4>
                <Textarea
                  placeholder="Internal admin note…"
                  rows={3}
                  className="text-sm resize-none mb-2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleSaveNote}
                  disabled={!note.trim() || saving}
                >
                  <Send className="w-3.5 h-3.5" />
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
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
    <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/40 border border-border/40">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium truncate capitalize">{value}</p>
      </div>
    </div>
  );
}
