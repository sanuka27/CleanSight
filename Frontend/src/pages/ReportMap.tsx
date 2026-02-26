import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Filter, 
  Search, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  Trash2,
  Layers,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useReports } from "@/hooks/useReports";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ReportItem {
  _id: string;
  firebaseUid: string;
  description: string;
  status: "pending" | "assigned" | "resolved";
  wasteType: string;
  location: { lat: number; lng: number };
  assignedTo: string | null;
  createdAt: string;
}

interface VolunteerUser {
  firebaseUid: string;
  name: string;
  email: string;
}

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-info/10 text-info border-info/20",
  completed: "bg-success/10 text-success border-success/20",
  resolved: "bg-success/10 text-success border-success/20",
};

const statusIcons = {
  pending: AlertCircle,
  assigned: Clock,
  completed: CheckCircle,
  resolved: CheckCircle,
};

const ReportMap = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [userRole, setUserRole] = useState<string>("citizen");
  const [volunteers, setVolunteers] = useState<VolunteerUser[]>([]);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { getReports, assignSelf, assignReport, updateReportStatus } = useReports();
  const { user } = useAuth();
  const { toast } = useToast();

  const currentUid = user?.uid || "";

  // Fetch reports and user profile on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsData, meData] = await Promise.all([
          getReports(),
          api.getMe(),
        ]);
        setReports(reportsData);
        setUserRole(meData?.data?.user?.role || "citizen");

        // Fetch volunteers list for staff/admin
        const role = meData?.data?.user?.role;
        if (role === "staff" || role === "admin") {
          try {
            const volData = await api.getVolunteers();
            setVolunteers(volData.data || []);
          } catch {
            // Non-critical: assignment dropdown will be empty
          }
        }
      } catch {
        // Fallback: show empty list
      }
    };
    if (user) fetchData();
  }, [user]);

  const refreshReports = async () => {
    try {
      const data = await getReports();
      setReports(data);
    } catch { /* silent */ }
  };

  const handleAssignSelf = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await assignSelf(reportId);
      toast({ title: "Task Accepted", description: "Report has been assigned to you." });
      await refreshReports();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to accept task", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssign = async (reportId: string) => {
    const volunteerUid = assignSelections[reportId];
    if (!volunteerUid) {
      toast({ title: "Select Volunteer", description: "Please select a volunteer to assign.", variant: "destructive" });
      return;
    }
    setActionLoading(reportId);
    try {
      await assignReport(reportId, volunteerUid);
      toast({ title: "Assigned", description: "Report assigned to volunteer." });
      await refreshReports();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to assign", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await updateReportStatus(reportId, "resolved");
      toast({ title: "Resolved", description: "Report marked as resolved." });
      await refreshReports();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to resolve", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  const filteredReports = reports.filter((r) =>
    r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.wasteType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const assignedCount = reports.filter((r) => r.status === "assigned").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-16">
        <div className="h-[calc(100vh-4rem)] flex">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full md:w-96 bg-card border-r border-border overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h1 className="font-display text-xl font-bold mb-4">Report Map</h1>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" className="gap-1">
                  <Filter className="w-3 h-3" />
                  All Status
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Trash2 className="w-3 h-3" />
                  Type
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Layers className="w-3 h-3" />
                  Urgency
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 bg-secondary/50 border-b border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-display text-xl font-bold text-warning">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-info">{assignedCount}</p>
                  <p className="text-xs text-muted-foreground">Assigned</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-success">{resolvedCount}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>

            {/* Report List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredReports.map((report) => {
                const StatusIcon = statusIcons[report.status as keyof typeof statusIcons] || AlertCircle;
                const isLoading = actionLoading === report._id;
                return (
                  <motion.div
                    key={report._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-background rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm line-clamp-1">{report.description}</h3>
                      <Badge variant="outline" className={statusColors[report.status as keyof typeof statusColors] || ""}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {report.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {report.location?.lat?.toFixed(4)}, {report.location?.lng?.toFixed(4)}
                      <span className="mx-1">•</span>
                      {formatDate(report.createdAt)}
                    </div>

                    {/* Role-based action buttons */}
                    {userRole === "volunteer" && report.status === "pending" && (
                      <div className="mt-3 pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs gap-1 border-primary/30 hover:bg-primary hover:text-white"
                          disabled={isLoading}
                          onClick={(e) => { e.stopPropagation(); handleAssignSelf(report._id); }}
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Accept Task
                        </Button>
                      </div>
                    )}

                    {userRole === "volunteer" && report.status === "assigned" && report.assignedTo === currentUid && (
                      <div className="mt-3 pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs gap-1 border-success/30 text-success hover:bg-success hover:text-white"
                          disabled={isLoading}
                          onClick={(e) => { e.stopPropagation(); handleResolve(report._id); }}
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Mark as Resolved
                        </Button>
                      </div>
                    )}

                    {(userRole === "staff" || userRole === "admin") && report.status === "pending" && (
                      <div className="mt-3 pt-2 border-t border-border/50 space-y-2">
                        <div className="flex gap-2">
                          <select
                            className="flex-1 text-xs rounded-md border border-border bg-background px-2 py-1.5 outline-none"
                            value={assignSelections[report._id] || ""}
                            onChange={(e) => setAssignSelections((prev) => ({ ...prev, [report._id]: e.target.value }))}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Select volunteer...</option>
                            {volunteers.map((v) => (
                              <option key={v.firebaseUid} value={v.firebaseUid}>{v.name}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-primary/30 hover:bg-primary hover:text-white"
                            disabled={isLoading}
                            onClick={(e) => { e.stopPropagation(); handleAssign(report._id); }}
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {(userRole === "staff" || userRole === "admin") && report.status === "assigned" && (
                      <div className="mt-3 pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs gap-1 border-success/30 text-success hover:bg-success hover:text-white"
                          disabled={isLoading}
                          onClick={(e) => { e.stopPropagation(); handleResolve(report._id); }}
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Mark as Resolved
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {filteredReports.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">No reports found.</div>
              )}
            </div>
          </motion.aside>

          {/* Map Area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden md:flex flex-1 items-center justify-center bg-muted relative"
          >
            {/* Placeholder for map */}
            <div className="text-center p-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Interactive Map</h2>
              <p className="text-muted-foreground max-w-md">
                Connect your map provider to enable the interactive map with real-time waste report markers.
              </p>
              <Button variant="hero" className="mt-6">
                Enable Map Integration
              </Button>
            </div>

            {/* Map Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
              <Button variant="secondary" size="icon" className="shadow-elevated">
                <span className="text-lg font-bold">+</span>
              </Button>
              <Button variant="secondary" size="icon" className="shadow-elevated">
                <span className="text-lg font-bold">−</span>
              </Button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-6 left-6 glass-strong rounded-xl p-4">
              <h4 className="font-medium text-sm mb-3">Legend</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span>Pending Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-info" />
                  <span>Assigned Tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span>Completed</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ReportMap;
