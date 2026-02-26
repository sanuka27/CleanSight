import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Image,
} from "lucide-react";
import { motion } from "framer-motion";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { useCitizenDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { DashboardReport } from "@/types/dashboard";

const statusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-info/10 text-info border-info/20",
  resolved: "bg-success/10 text-success border-success/20",
};

const urgencyIcon: Record<string, React.ReactNode> = {
  high: <AlertCircle className="w-4 h-4 text-destructive" />,
  medium: <Clock className="w-4 h-4 text-warning" />,
  low: <CheckCircle className="w-4 h-4 text-success" />,
};

const CitizenDashboard = () => {
  const { user } = useAuth();
  const { data, isLoading, error, fetch } = useCitizenDashboard();
  const navigate = useNavigate();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const totals = data?.myTotals ?? { total: 0, pending: 0, assigned: 0, resolved: 0 };
  const reports = data?.recentReports ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-10 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <RevealOnScroll>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold mb-2">
                  Welcome, <span className="text-gradient">{user?.displayName?.split(" ")[0] || "Citizen"}</span>
                </h1>
                <p className="text-muted-foreground">
                  {isLoading
                    ? "Loading your reports…"
                    : error
                    ? "Could not load dashboard data."
                    : "Here's an overview of your waste reports."}
                </p>
              </div>
              <Button
                onClick={() => navigate("/report")}
                className="gradient-primary text-white shadow-glow gap-2"
              >
                <FileText className="w-4 h-4" /> Report Waste
              </Button>
            </div>
          </RevealOnScroll>

          {/* Summary Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Reports", value: totals.total, icon: MapPin, color: "primary" },
              { label: "Pending", value: totals.pending, icon: Clock, color: "warning" },
              { label: "Assigned", value: totals.assigned, icon: AlertCircle, color: "info" },
              { label: "Resolved", value: totals.resolved, icon: CheckCircle, color: "success" },
            ].map((stat, i) => (
              <RevealOnScroll key={stat.label} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="glass-premium p-6 rounded-2xl border border-white/5 relative overflow-hidden group"
                >
                  <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity bg-${stat.color}/10 rounded-bl-3xl`}>
                    <stat.icon className={`w-12 h-12 text-${stat.color}`} />
                  </div>
                  <div className={`p-3 rounded-xl bg-${stat.color}/10 text-${stat.color} w-fit mb-4`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold font-display mb-1">{stat.value}</h3>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </motion.div>
              </RevealOnScroll>
            ))}
          </div>

          {/* Recent Reports */}
          <RevealOnScroll delay={0.2}>
            <Card className="glass-premium border-white/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Your Recent Reports</h3>
                <span className="text-sm text-muted-foreground">{reports.length} reports</span>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No reports yet. Start by reporting waste in your area!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report: DashboardReport) => (
                    <motion.div
                      key={report._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-4 p-4 rounded-xl border border-border/50 hover:bg-accent/5 transition-colors"
                    >
                      {report.imageUrl ? (
                        <img
                          src={report.imageUrl}
                          alt="Report"
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted/20 flex items-center justify-center flex-shrink-0">
                          <Image className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={statusColor[report.status] || ""}>
                            {report.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {report.wasteType}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {urgencyIcon[report.urgency]}
                            {report.urgency}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {report.description || "No description"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(report.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </RevealOnScroll>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CitizenDashboard;
