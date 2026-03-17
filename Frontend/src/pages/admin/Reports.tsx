import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { AdminTopbar } from "@/components/admin/Topbar";
import { ReportsTable } from "@/components/admin/ReportsTable";
import { ReportDrawer } from "@/components/admin/ReportDrawer";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import {
  BulkAssignDialog,
  BulkStatusDialog,
  BulkRejectDialog,
  BulkExportDialog,
} from "@/components/admin/BulkActionDialogs";
import { BulkResultSummary } from "@/components/admin/BulkResultSummary";
import { useToast } from "@/hooks/use-toast";
import {
  listAdminReports,
  listAdminVolunteers,
  exportReportsCsv,
  bulkAssignReports,
  bulkUpdateReportStatus,
  bulkRejectReports,
  bulkExportReports,
} from "@/services/admin";
import type {
  AdminReport,
  AdminVolunteer,
  DateRange,
  ReportFilters,
  ReportStatus,
  BulkActionResult,
} from "@/types/admin";
import { exportToCsv } from "@/utils/exportCsv";

const PAGE_SIZE = 20;

function rangeToFromTo(r: DateRange, custom: { from: string; to: string }) {
  if (r === "custom") return { from: custom.from || undefined, to: custom.to || undefined };
  const now = new Date();
  const days = r === "7d" ? 7 : r === "30d" ? 30 : 90;
  return {
    from: new Date(now.getTime() - days * 86400000).toISOString(),
    to: now.toISOString(),
  };
}

type BulkDialog = "assign" | "status" | "reject" | "export" | null;

export default function AdminReports() {
  const { toast } = useToast();
  const [range, setRange] = useState<DateRange>("30d");
  const [customDates, setCustomDates] = useState({ from: "", to: "" });
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [wasteTypeFilter, setWasteTypeFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [aiReviewStatusFilter, setAiReviewStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [volunteers, setVolunteers] = useState<AdminVolunteer[]>([]);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDialog, setActiveDialog] = useState<BulkDialog>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [, startTransition] = useTransition();

  const loadReports = useCallback(async (opts: ReportFilters & { pg?: number } = {}) => {
    setLoading(true);
    try {
      const currentPage = opts.pg ?? page;
      const dates = rangeToFromTo(range, customDates);
      const res = await listAdminReports({
        page: currentPage,
        limit: PAGE_SIZE,
        search,
        status: statusFilter,
        wasteType: wasteTypeFilter,
        urgency: urgencyFilter,
        aiReviewStatus: aiReviewStatusFilter,
        sortBy,
        sortOrder,
        from: dates.from,
        to: dates.to,
        ...opts,
      });
      setReports(res.data);
      setTotal(res.pagination.total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
}, [page, search, statusFilter, wasteTypeFilter, urgencyFilter, aiReviewStatusFilter, sortBy, sortOrder, range, customDates, toast]);

  // Load volunteers for assignment dropdown
  useEffect(() => {
    listAdminVolunteers({ limit: 200 })
      .then((res) => setVolunteers(res.data))
      .catch(() => {});
  }, []);

  // Reload when filters change, reset to p1, clear selection
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    loadReports({ pg: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, wasteTypeFilter, urgencyFilter, aiReviewStatusFilter, sortBy, sortOrder, range]);

  // Reload when page changes
  const prevPage = useRef(page);
  useEffect(() => {
    if (prevPage.current !== page) {
      prevPage.current = page;
      loadReports({ pg: page });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  function handleReportUpdated(updated: AdminReport) {
    setReports((prev) =>
      prev.map((r) => (r._id === updated._id ? updated : r))
    );
    setSelectedReport(updated);
  }

  // ── Selection handlers ────────────────────────────────────────────

  const handleToggleSelect = useCallback((id: string) => {
    startTransition(() => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    startTransition(() => {
      setSelectedIds((prev) => {
        const allIds = reports.map((r) => r._id);
        const allSelected = allIds.every((id) => prev.has(id));
        if (allSelected) {
          const next = new Set(prev);
          allIds.forEach((id) => next.delete(id));
          return next;
        } else {
          const next = new Set(prev);
          allIds.forEach((id) => next.add(id));
          return next;
        }
      });
    });
  }, [reports]);

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // ── Bulk action result handler ────────────────────────────────────

  function handleBulkResult(
    result: BulkActionResult,
    actionLabel: string,
    keepFailed = true
  ) {
    toast({
      title: `${actionLabel} complete`,
      description: (
        <BulkResultSummary result={result} action={actionLabel} />
      ),
      variant: result.failed.length > 0 ? "destructive" : "default",
      duration: 6000,
    });

    if (keepFailed && result.failed.length > 0) {
      // Keep only failed IDs selected so admin can retry
      const failedSet = new Set(result.failed.map((f) => f.id));
      setSelectedIds(failedSet);
    } else {
      clearSelection();
    }

    // Reload table to reflect changes
    loadReports({ pg: page });
  }

  // ── Bulk action handlers ──────────────────────────────────────────

  const MAX_BULK_UI = 200;

  function guardBulkSize(): boolean {
    if (selectedIds.size > MAX_BULK_UI) {
      toast({
        title: "Too many selected",
        description: `Select at most ${MAX_BULK_UI} reports at a time. Currently ${selectedIds.size} selected.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  }

  async function handleBulkAssign(volunteerUid: string, note: string) {
    if (!guardBulkSize()) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkAssignReports(ids, volunteerUid, note || undefined);
      setActiveDialog(null);
      handleBulkResult(result, "Bulk Assign");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bulk assign failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkStatus(status: ReportStatus) {
    if (!guardBulkSize()) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkUpdateReportStatus(ids, status);
      setActiveDialog(null);
      handleBulkResult(result, "Bulk Status Update");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bulk status update failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkReject(reason: string) {
    if (!guardBulkSize()) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkRejectReports(ids, reason);
      setActiveDialog(null);
      handleBulkResult(result, "Bulk Reject");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bulk reject failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleExportSelected() {
    if (!guardBulkSize()) return;
    setBulkLoading(true);
    try {
      await bulkExportReports({ reportIds: Array.from(selectedIds) });
      setActiveDialog(null);
      toast({ title: "Export ready", description: `${selectedIds.size} reports exported.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Export failed";
      toast({ title: "Export Error", description: msg, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleExportFiltered() {
    setBulkLoading(true);
    try {
      const dates = rangeToFromTo(range, customDates);
      await bulkExportReports({
        filters: {
          status: statusFilter || undefined,
          wasteType: wasteTypeFilter || undefined,
          urgency: urgencyFilter || undefined,
          q: search || undefined,
          dateFrom: dates.from,
          dateTo: dates.to,
        },
      });
      setActiveDialog(null);
      toast({ title: "Export ready", description: "Filtered reports exported." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Export failed";
      toast({ title: "Export Error", description: msg, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleExport() {
    try {
      const res = await exportReportsCsv({
        status: statusFilter,
        wasteType: wasteTypeFilter,
      });
      exportToCsv(res.data as Record<string, unknown>[], "reports-export");
      toast({ title: "Export ready", description: `${res.data.length} reports exported.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Export failed";
      toast({ title: "Export Error", description: msg, variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminTopbar
        title="Reports Management"
        subtitle="View, filter, and manage all waste reports"
        range={range}
        onRangeChange={setRange}
        onCustomDatesChange={(from, to) => setCustomDates({ from, to })}
        onSearch={setSearch}
        onExport={handleExport}
        exportLabel="Export CSV"
      />

      <div className="flex-1 p-6">
        <ReportsTable
          reports={reports}
          loading={loading}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onView={setSelectedReport}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          statusFilter={statusFilter}
          wasteTypeFilter={wasteTypeFilter}
          urgencyFilter={urgencyFilter}
          aiReviewStatusFilter={aiReviewStatusFilter}
          onStatusFilter={setStatusFilter}
          onWasteTypeFilter={setWasteTypeFilter}
          onUrgencyFilter={setUrgencyFilter}
          onAiReviewStatusFilter={setAiReviewStatusFilter}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onToggleSelectAll={onToggleSelectAll}
        />
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={onClearSelection}
          onAssign={() => setActiveDialog("assign")}
          onStatus={() => setActiveDialog("status")}
          onReject={() => setActiveDialog("reject")}
          onExport={() => setActiveDialog("export")}
        />
      </div>

      {/* Single Report Drawer */}
      {selectedReport && (
        <ReportDrawer
          report={selectedReport}
          volunteers={volunteers}
          onClose={() => setSelectedReport(null)}
          onUpdated={handleReportUpdated}
        />
      )}

      {/* Bulk Action Dialogs */}
      <BulkAssignDialog
        open={activeDialog === "assign"}
        onClose={() => setActiveDialog(null)}
        selectedCount={selectedIds.size}
        volunteers={volunteers}
        onConfirm={handleBulkAssign}
        loading={bulkLoading}
      />

      <BulkStatusDialog
        open={activeDialog === "status"}
        onClose={() => setActiveDialog(null)}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkStatus}
        loading={bulkLoading}
      />

      <BulkRejectDialog
        open={activeDialog === "reject"}
        onClose={() => setActiveDialog(null)}
        selectedCount={selectedIds.size}
        onConfirm={handleBulkReject}
        loading={bulkLoading}
      />

      <BulkExportDialog
        open={activeDialog === "export"}
        onClose={() => setActiveDialog(null)}
        selectedCount={selectedIds.size}
        onExportSelected={handleExportSelected}
        onExportFiltered={handleExportFiltered}
        loading={bulkLoading}
      />
    </div>
  );
}
