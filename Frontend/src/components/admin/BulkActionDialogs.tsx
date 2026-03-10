import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminVolunteer, ReportStatus } from "@/types/admin";

// ── Bulk Assign Dialog ──────────────────────────────────────────────

interface BulkAssignDialogProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  volunteers: AdminVolunteer[];
  onConfirm: (volunteerUid: string, note: string) => Promise<void>;
  loading?: boolean;
}

export function BulkAssignDialog({
  open,
  onClose,
  selectedCount,
  volunteers,
  onConfirm,
  loading,
}: BulkAssignDialogProps) {
  const [volunteerUid, setVolunteerUid] = useState("");
  const [note, setNote] = useState("");

  function handleClose() {
    setVolunteerUid("");
    setNote("");
    onClose();
  }

  async function handleConfirm() {
    if (!volunteerUid) return;
    await onConfirm(volunteerUid, note);
    setVolunteerUid("");
    setNote("");
  }

  const activeVolunteers = volunteers.filter((v) => v.isActive !== false);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Assign — {selectedCount} Reports</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Assign to Volunteer</Label>
            <Select value={volunteerUid} onValueChange={setVolunteerUid}>
              <SelectTrigger>
                <SelectValue placeholder="Select a volunteer…" />
              </SelectTrigger>
              <SelectContent>
                {activeVolunteers.map((v) => (
                  <SelectItem key={v.firebaseUid} value={v.firebaseUid}>
                    {v.name} ({v.email})
                  </SelectItem>
                ))}
                {activeVolunteers.length === 0 && (
                  <SelectItem value="_none" disabled>
                    No active volunteers found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="Add a note for the volunteer…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!volunteerUid || loading}
          >
            {loading ? "Assigning…" : `Assign ${selectedCount} Reports`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Status Dialog ──────────────────────────────────────────────

const STATUS_OPTIONS: { value: ReportStatus; label: string; warning?: string }[] = [
  { value: "pending",     label: "Pending" },
  { value: "verified",    label: "Verified" },
  { value: "assigned",    label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved",    warning: "This will mark reports as done." },
  { value: "rejected",    label: "Rejected",    warning: "Use the Bulk Reject action to add a reason." },
];

interface BulkStatusDialogProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (status: ReportStatus) => Promise<void>;
  loading?: boolean;
}

export function BulkStatusDialog({
  open,
  onClose,
  selectedCount,
  onConfirm,
  loading,
}: BulkStatusDialogProps) {
  const [status, setStatus] = useState<ReportStatus | "">("");

  function handleClose() {
    setStatus("");
    onClose();
  }

  async function handleConfirm() {
    if (!status) return;
    await onConfirm(status as ReportStatus);
    setStatus("");
  }

  const selected = STATUS_OPTIONS.find((s) => s.value === status);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Status — {selectedCount} Reports</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>New Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status…" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected?.warning && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ {selected.warning}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Reports that already have invalid transitions will be skipped and reported in the result summary.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!status || loading}>
            {loading ? "Updating…" : `Update ${selectedCount} Reports`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Reject Dialog ──────────────────────────────────────────────

interface BulkRejectDialogProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

export function BulkRejectDialog({
  open,
  onClose,
  selectedCount,
  onConfirm,
  loading,
}: BulkRejectDialogProps) {
  const [reason, setReason] = useState("");

  function handleClose() {
    setReason("");
    onClose();
  }

  async function handleConfirm() {
    if (reason.trim().length < 5) return;
    await onConfirm(reason.trim());
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Reject — {selectedCount} Reports</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            All selected reports (except already-resolved ones) will be marked as rejected.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label>
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Provide a reason for rejecting these reports (min 5 characters)…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              className={reason.trim().length > 0 && reason.trim().length < 5 ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={reason.trim().length < 5 || loading}
          >
            {loading ? "Rejecting…" : `Reject ${selectedCount} Reports`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Export Dialog ──────────────────────────────────────────────

interface BulkExportDialogProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onExportSelected: () => Promise<void>;
  onExportFiltered: () => Promise<void>;
  loading?: boolean;
}

export function BulkExportDialog({
  open,
  onClose,
  selectedCount,
  onExportSelected,
  onExportFiltered,
  loading,
}: BulkExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Reports as CSV</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={onExportSelected}
            disabled={loading || selectedCount === 0}
          >
            <span className="font-semibold">Selected only</span>
            <span className="text-muted-foreground text-xs">({selectedCount} reports)</span>
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={onExportFiltered}
            disabled={loading}
          >
            <span className="font-semibold">Current filtered results</span>
            <span className="text-muted-foreground text-xs">(up to 5,000)</span>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
