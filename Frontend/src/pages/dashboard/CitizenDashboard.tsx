import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useCitizenDashboard } from "@/hooks/useDashboard";
import { DashboardHeader } from "@/components/citizen/DashboardHeader";
import { StatsCards } from "@/components/citizen/StatsCards";
import { ReportsList } from "@/components/citizen/ReportsList";
import { QuickActions } from "@/components/citizen/QuickActions";
import { ActivityTimeline } from "@/components/citizen/ActivityTimeline";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CitizenDashboard = () => {
  const { data, isLoading, error, fetch } = useCitizenDashboard();

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

          {/* Main content: Reports list + Sidebar */}
          <div className="grid lg:grid-cols-[1fr_280px] gap-6">
            {/* Reports list — main panel */}
            <ReportsList reports={reports} isLoading={isLoading} />

            {/* Right sidebar — desktop stacked, mobile below */}
            <div className="space-y-4">
              <QuickActions />
              <ActivityTimeline reports={reports} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CitizenDashboard;
