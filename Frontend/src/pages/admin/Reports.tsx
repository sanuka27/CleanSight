import { useState, useEffect, useCallback, useRef } from "react";
import { Download } from "lucide-react";
import { AdminTopbar } from "@/components/admin/Topbar";
import { ReportsTable } from "@/components/admin/ReportsTable";
import { ReportDrawer } from "@/components/admin/ReportDrawer";
import { useToast } from "@/hooks/use-toast";
import {
  listAdminReports,
  listAdminVolunteers,
  exportReportsCsv,
} from "@/services/admin";
import type { AdminReport, AdminVolunteer, DateRange, ReportFilters } from "@/types/admin";
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
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [volunteers, setVolunteers] = useState<AdminVolunteer[]>([]);

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
  }, [page, search, statusFilter, wasteTypeFilter, urgencyFilter, sortBy, sortOrder, range, customDates, toast]);

  // Load volunteers for assignment dropdown
  useEffect(() => {
    listAdminVolunteers({ limit: 100 })
      .then((res) => setVolunteers(res.data))
      .catch(() => {});
  }, []);

  // Reload when filters change, reset to p1
  useEffect(() => {
    setPage(1);
    loadReports({ pg: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, wasteTypeFilter, urgencyFilter, sortBy, sortOrder, range]);

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
          onStatusFilter={setStatusFilter}
          onWasteTypeFilter={setWasteTypeFilter}
          onUrgencyFilter={setUrgencyFilter}
        />
      </div>

      {/* Report Drawer */}
      {selectedReport && (
        <ReportDrawer
          report={selectedReport}
          volunteers={volunteers}
          onClose={() => setSelectedReport(null)}
          onUpdated={handleReportUpdated}
        />
      )}
    </div>
  );
}
