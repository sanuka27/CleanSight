import { useState, useCallback, useRef, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useCitizenDashboardQuery } from "@/hooks/useDashboardQueries";
import { DashboardHeader } from "@/components/citizen/DashboardHeader";
import { StatsCards } from "@/components/citizen/StatsCards";
import { InsightCards } from "@/components/citizen/InsightCards";
import { CitizenBadgesPanel } from "@/components/citizen/CitizenBadgesPanel";
import { MyReportsTable } from "@/components/citizen/MyReportsTable";
import { QuickActions } from "@/components/citizen/QuickActions";
import { RecentActivityPanel } from "@/components/citizen/RecentActivityPanel";
import { ReportDetailsModal } from "@/components/citizen/ReportDetailsModal";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { DashboardReport } from "@/types/dashboard";
import { useToast } from "@/hooks/use-toast";

const CitizenDashboard = () => {
  const { data, isLoading, error, refetch } = useCitizenDashboardQuery();
  const { toast } = useToast();

  // Report details modal state
  const [selectedReport, setSelectedReport] = useState<DashboardReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Ref for scrolling to reports section & auto-filtering
  const reportsRef = useRef<HTMLDivElement>(null);
  const [pendingFilterActive, setPendingFilterActive] = useState(false);
  const badgeToastKeyRef = useRef<string>("");

  // Convert error to string for display
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  const totals = data?.myTotals ?? {
    total: 0,
    pending: 0,
    assigned: 0,
    resolved: 0,
  };
  const reports = data?.recentReports ?? [];
  const citizenProfile = data?.citizenProfile;
  const citizenBadges = citizenProfile?.badges ?? [];
  const badgeCatalog = citizenProfile?.badgeCatalog ?? [];
  const reportsSubmitted = citizenProfile?.reportsSubmitted ?? totals.total;
  const newlyEarnedBadges = data?.newlyEarnedBadges ?? [];

  useEffect(() => {
    if (newlyEarnedBadges.length === 0) return;
    const key = newlyEarnedBadges.map((badge) => badge.id || badge.name).join("|");
    if (badgeToastKeyRef.current === key) return;
    badgeToastKeyRef.current = key;

    const badgeNames = newlyEarnedBadges.map((badge) => badge.name).join(", ");
    const title = newlyEarnedBadges.length === 1 ? "Badge unlocked!" : "Badges unlocked!";
    const description = newlyEarnedBadges.length === 1
      ? `You earned ${badgeNames}.`
      : `You earned ${newlyEarnedBadges.length} badges: ${badgeNames}.`;

    toast({ title, description });
  }, [newlyEarnedBadges, toast]);

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
    // Scroll to reports section and apply pending filter
    setPendingFilterActive(true);
    reportsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 pt-24 pb-12 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Error banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{errorMessage}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
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
            error={errorMessage}
            totalReports={totals.total}
          />

          {/* Stats cards row */}
          <StatsCards totals={totals} isLoading={isLoading} />

          {/* Citizen badges */}
          <CitizenBadgesPanel
            badges={citizenBadges}
            catalog={badgeCatalog}
            reportsSubmitted={reportsSubmitted}
            isLoading={isLoading}
          />

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
              initialStatusFilter={pendingFilterActive ? "pending" : "all"}
              key={pendingFilterActive ? "pending" : "all"}
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
