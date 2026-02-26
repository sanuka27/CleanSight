import { useEffect, useState, useCallback } from "react";
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
  ClipboardList,
  Image,
  Loader2,
  Map as MapIcon,
  Navigation,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RevealOnScroll } from "@/components/shared/AnimatedComponents";
import { useVolunteerDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { DashboardReport } from "@/types/dashboard";
import { CleanSightMap } from "@/components/maps/CleanSightMap";
import { RouteOverlay } from "@/components/maps/RouteOverlay";
import type { LatLng, MapReportMarker } from "@/types/map";
import { DEFAULT_NEAR_RADIUS_KM } from "@/constants/map";

const statusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  assigned: "bg-info/10 text-info border-info/20",
  resolved: "bg-success/10 text-success border-success/20",
};

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const { data, isLoading, error, fetch } = useVolunteerDashboard();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Near Me map state
  const [showNearMap, setShowNearMap] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [nearbyReports, setNearbyReports] = useState<MapReportMarker[]>([]);
  const [nearLoading, setNearLoading] = useState(false);
  const [routeTo, setRouteTo] = useState<LatLng | null>(null);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const assigned = data?.assignedToMe ?? [];
  const pending = data?.pendingNearby ?? [];
  const stats = data?.myStats ?? { assignedCount: 0, resolvedCount: 0 };

  /* ── Near-me helpers ─────────────────────────────────────────── */

  const fetchNearby = useCallback(async (loc: LatLng) => {
    setNearLoading(true);
    try {
      const res = await api.listReportsForMap({
        near: { lat: loc.lat, lng: loc.lng, radiusKm: DEFAULT_NEAR_RADIUS_KM },
        status: ["pending"],
      });
      setNearbyReports(res.data);
    } catch (err) {
      console.error("Failed to fetch nearby reports:", err);
    } finally {
      setNearLoading(false);
    }
  }, []);

  const toggleNearMap = useCallback(() => {
    if (showNearMap) {
      setShowNearMap(false);
      setRouteTo(null);
      return;
    }
    setShowNearMap(true);
    if (userLocation) {
      fetchNearby(userLocation);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        fetchNearby(loc);
      },
      () => console.error("Geolocation denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [showNearMap, userLocation, fetchNearby]);

  const handleAccept = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await api.assignSelf(reportId);
      await fetch(); // refresh
    } catch (err) {
      console.error("Failed to accept task:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await api.updateReportStatus(reportId, "resolved");
      await fetch(); // refresh
    } catch (err) {
      console.error("Failed to resolve:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const ReportCard = ({
    report,
    actions,
  }: {
    report: DashboardReport;
    actions?: React.ReactNode;
  }) => (
    <motion.div
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
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="outline" className={statusColor[report.status] || ""}>
            {report.status}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {report.wasteType}
          </Badge>
          <span className="text-xs text-muted-foreground">{report.urgency}</span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {report.description || "No description"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(report.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {actions && <div className="mt-3 flex gap-2">{actions}</div>}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-10 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <RevealOnScroll>
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">
                Hello, <span className="text-gradient">{user?.displayName?.split(" ")[0] || "Volunteer"}</span>
              </h1>
              <p className="text-muted-foreground">
                {isLoading
                  ? "Loading tasks…"
                  : error
                  ? "Could not load dashboard."
                  : "Your assigned tasks and available reports."}
              </p>
            </div>
          </RevealOnScroll>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Assigned (7d)", value: stats.assignedCount, icon: ClipboardList, color: "info" },
              { label: "Resolved (7d)", value: stats.resolvedCount, icon: CheckCircle, color: "success" },
              { label: "My Active Tasks", value: assigned.length, icon: Clock, color: "warning" },
            ].map((stat, i) => (
              <RevealOnScroll key={stat.label} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="glass-premium p-6 rounded-2xl border border-white/5"
                >
                  <div className={`p-3 rounded-xl bg-${stat.color}/10 text-${stat.color} w-fit mb-4`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold font-display mb-1">{stat.value}</h3>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </motion.div>
              </RevealOnScroll>
            ))}
          </div>

          {/* Near Me Map Toggle */}
          <RevealOnScroll delay={0.15}>
            <div className="flex items-center gap-3">
              <Button
                variant={showNearMap ? "default" : "outline"}
                className="gap-2"
                onClick={toggleNearMap}
              >
                {showNearMap ? <X className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                {showNearMap ? "Close Map" : "Near Me Map"}
              </Button>
              {showNearMap && nearbyReports.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {nearbyReports.length} pending report{nearbyReports.length !== 1 ? "s" : ""} within {DEFAULT_NEAR_RADIUS_KM} km
                </span>
              )}
            </div>
          </RevealOnScroll>

          {/* Near Me Map Panel */}
          <AnimatePresence>
            {showNearMap && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="glass-premium border-white/5 p-4">
                  {nearLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                      <span className="text-muted-foreground">Finding nearby reports…</span>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-border h-[400px]">
                      <CleanSightMap
                        mode="view"
                        reports={nearbyReports}
                        showUserLocation
                        onSelectReport={(r) => {
                          if (!userLocation) return;
                          const coords = r.location.coordinates;
                          setRouteTo({ lat: coords[1], lng: coords[0] });
                        }}
                        className="h-full w-full"
                      >
                        {userLocation && routeTo && (
                          <RouteOverlay from={userLocation} to={routeTo} />
                        )}
                      </CleanSightMap>
                    </div>
                  )}
                  {routeTo && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        <Navigation className="w-3 h-3 inline mr-1" />
                        Route to {routeTo.lat.toFixed(4)}, {routeTo.lng.toFixed(4)}
                      </p>
                      <Button size="sm" variant="ghost" onClick={() => setRouteTo(null)}>
                        Clear Route
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* My Assigned Tasks */}
          <RevealOnScroll delay={0.2}>
            <Card className="glass-premium border-white/5 p-6">
              <h3 className="font-bold text-lg mb-4">My Assigned Tasks</h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : assigned.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No tasks assigned to you yet.</p>
              ) : (
                <div className="space-y-4">
                  {assigned.map((r) => (
                    <ReportCard
                      key={r._id}
                      report={r}
                      actions={
                        <Button
                          size="sm"
                          className="gradient-primary text-white gap-1"
                          disabled={actionLoading === r._id}
                          onClick={() => handleResolve(r._id)}
                        >
                          {actionLoading === r._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Mark Resolved
                        </Button>
                      }
                    />
                  ))}
                </div>
              )}
            </Card>
          </RevealOnScroll>

          {/* Pending Reports (available to pick up) */}
          <RevealOnScroll delay={0.3}>
            <Card className="glass-premium border-white/5 p-6">
              <h3 className="font-bold text-lg mb-4">Available Reports</h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : pending.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending reports at the moment.</p>
              ) : (
                <div className="space-y-4">
                  {pending.map((r) => (
                    <ReportCard
                      key={r._id}
                      report={r}
                      actions={
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={actionLoading === r._id}
                          onClick={() => handleAccept(r._id)}
                        >
                          {actionLoading === r._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <MapPin className="w-3 h-3" />
                          )}
                          Accept Task
                        </Button>
                      }
                    />
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

export default VolunteerDashboard;
