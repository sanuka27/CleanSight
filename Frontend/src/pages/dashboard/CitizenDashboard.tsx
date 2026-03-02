import { useEffect, useState, useCallback, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useCitizenDashboard } from "@/hooks/useDashboard";
import { DashboardHeader } from "@/components/citizen/DashboardHeader";
import { StatsCards } from "@/components/citizen/StatsCards";
import { InsightCards } from "@/components/citizen/InsightCards";
import { MyReportsTable } from "@/components/citizen/MyReportsTable";
import { QuickActions } from "@/components/citizen/QuickActions";
import { RecentActivityPanel } from "@/components/citizen/RecentActivityPanel";
import { ReportDetailsModal } from "@/components/citizen/ReportDetailsModal";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { DashboardReport } from "@/types/dashboard";

const CitizenDashboard = () => {
  const { data, isLoading, error, fetch } = useCitizenDashboard();

  // Report details modal state
  const [selectedReport, setSelectedReport] = useState<DashboardReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Ref for scrolling to reports section & auto-filtering
  const reportsRef = useRef<HTMLDivElement>(null);
  const [pendingFilterTrigger, setPendingFilterTrigger] = useState(0);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const totals = data?.myTotals ?? {
    total: 0,
    pending: 0,
    assigned: 0,
    resolved: 0,
  };
  const reports = data?.recentReports ?? [];

  const handleViewDetails = useCallback((report: DashboardReport) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  }, []);

  const handleReportClickFromInsight = useCallback(
    (reportId: string) => {
      const report = reports.find((r) => r._id === reportId);
      if (report) {
        handleViewDetails(report);
      }
    },
    [reports, handleViewDetails]
  );

  const handleFilterPending = useCallback(() => {
    // Scroll to reports section and trigger pending filter
    setPendingFilterTrigger((c) => c + 1);
    reportsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 pt-24 pb-12 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetch()}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </motion.div>
          )}

          {/* Hero header */}
          <DashboardHeader
            isLoading={isLoading}
            error={error}
            totalReports={totals.total}
          />

          {/* Stats cards row */}
          <StatsCards totals={totals} isLoading={isLoading} />

          {/* Insight cards — computed metrics */}
          <InsightCards
            totals={totals}
            reports={reports}
            isLoading={isLoading}
            onReportClick={handleReportClickFromInsight}
          />

          {/* Main content: Reports list + Sidebar */}
          <div className="grid lg:grid-cols-[1fr_300px] gap-6" ref={reportsRef}>
            {/* Reports list — main panel */}
            <MyReportsTable
              reports={reports}
              isLoading={isLoading}
              onViewDetails={handleViewDetails}
              key={pendingFilterTrigger} // re-mount to reset filters when triggered
            />

            {/* Right sidebar — desktop stacked, mobile below */}
            <div className="space-y-4">
              <QuickActions
                reports={reports}
                onFilterPending={handleFilterPending}
              />
              <RecentActivityPanel
                reports={reports}
                onReportClick={handleViewDetails}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Report Details Modal */}
      <ReportDetailsModal
        report={selectedReport}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};

export default CitizenDashboard;
