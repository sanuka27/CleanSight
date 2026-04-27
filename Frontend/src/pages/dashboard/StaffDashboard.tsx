import { useState } from "react";
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
  Users,
  Image,
  Loader2,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { useStaffDashboardQuery } from "@/hooks/useDashboardQueries";
import { useAssignReportMutation } from "@/hooks/useReportsQueries";
import { useAuth } from "@/context/useAuth";
import type { DashboardReport, AvailableVolunteer } from "@/types/dashboard";

const statusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-info/10 text-info border-info/20",
  resolved: "bg-success/10 text-success border-success/20",
};

const StaffDashboard = () => {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useStaffDashboardQuery();
  const assignReportMutation = useAssignReportMutation();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [assignMenuOpen, setAssignMenuOpen] = useState<string | null>(null);

  const pendingReports = data?.pendingReports ?? [];
  const assignedReports = data?.assignedReports ?? [];
  const resolvedToday = data?.resolvedTodayCount ?? 0;
  const topVolunteers = data?.volunteerSnapshot ?? [];
  const availableVolunteers = data?.availableVolunteers ?? [];

  const handleAssign = async (reportId: string, volunteerUid: string) => {
    setActionLoading(reportId);
    try {
      await assignReportMutation.mutateAsync({ reportId, volunteerUid });
      setAssignMenuOpen(null);
      await refetch();
    } catch (err) {
      console.error("Failed to assign:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const ReportRow = ({
    report,
    showAssign,
  }: {
    report: DashboardReport;
    showAssign?: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl border border-border/50 hover:bg-accent/5 transition-colors"
    >
      {report.imageUrl ? (
        <img src={report.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-muted/20 flex items-center justify-center flex-shrink-0">
          <Image className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge variant="outline" className={statusColor[report.status] || ""}>{report.status}</Badge>
          <Badge variant="outline" className="text-xs">{report.wasteType}</Badge>
          <span className="text-xs text-muted-foreground">{report.urgency}</span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{report.description || "No description"}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(report.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>

        {showAssign && (
          <div className="mt-3">
            {assignMenuOpen === report._id ? (
              <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-background">
                <p className="text-xs font-medium text-muted-foreground mb-2">Assign to volunteer:</p>
                {availableVolunteers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No volunteers available</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableVolunteers.map((v: AvailableVolunteer) => (
                      <Button
                        key={v.firebaseUid}
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        disabled={actionLoading === report._id}
                        onClick={() => handleAssign(report._id, v.firebaseUid)}
                      >
                        {actionLoading === report._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserPlus className="w-3 h-3" />
                        )}
                        {v.name}
                      </Button>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setAssignMenuOpen(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => setAssignMenuOpen(report._id)}
              >
                <UserPlus className="w-3 h-3" /> Assign Volunteer
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-10 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <RevealOnScroll>
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">
                Staff Dashboard
              </h1>
              <p className="text-muted-foreground">
                {isLoading ? "Loading…" : error ? "Could not load dashboard." : "Triage reports and manage volunteer assignments."}
              </p>
            </div>
          </RevealOnScroll>

          {/* Quick Stats */}
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: "Pending", value: pendingReports.length, icon: Clock, color: "warning" },
              { label: "Assigned", value: assignedReports.length, icon: AlertCircle, color: "info" },
              { label: "Resolved Today", value: resolvedToday, icon: CheckCircle, color: "success" },
              { label: "Volunteers", value: availableVolunteers.length, icon: Users, color: "primary" },
            ].map((stat, i) => (
              <RevealOnScroll key={stat.label} delay={i * 0.08}>
                <motion.div whileHover={{ y: -3 }} className="glass-premium p-5 rounded-2xl border border-white/5">
                  <div className={`p-2.5 rounded-xl bg-${stat.color}/10 text-${stat.color} w-fit mb-3`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-bold font-display">{stat.value}</h3>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </motion.div>
              </RevealOnScroll>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pending Reports */}
            <RevealOnScroll delay={0.15}>
              <Card className="glass-premium border-white/5 p-6">
                <h3 className="font-bold text-lg mb-4">Pending Reports</h3>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : pendingReports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No pending reports. All clear!</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {pendingReports.map((r) => (
                      <ReportRow key={r._id} report={r} showAssign />
                    ))}
                  </div>
                )}
              </Card>
            </RevealOnScroll>

            {/* Assigned Reports */}
            <RevealOnScroll delay={0.2}>
              <Card className="glass-premium border-white/5 p-6">
                <h3 className="font-bold text-lg mb-4">Assigned Reports</h3>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : assignedReports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No assigned reports currently.</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {assignedReports.map((r) => (
                      <ReportRow key={r._id} report={r} />
                    ))}
                  </div>
                )}
              </Card>
            </RevealOnScroll>
          </div>

          {/* Top Volunteers */}
          <RevealOnScroll delay={0.25}>
            <Card className="glass-premium border-white/5 p-6">
              <h3 className="font-bold text-lg mb-4">Top Volunteers (Last 7 Days)</h3>
              {topVolunteers.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No volunteer activity in the last 7 days.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {topVolunteers.map((v, i) => (
                    <motion.div
                      key={v.firebaseUid}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl border border-border/50 text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2 font-bold">
                        {i + 1}
                      </div>
                      <p className="font-medium text-sm truncate">{v.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {v.resolvedCount} resolved
                      </p>
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

export default StaffDashboard;
