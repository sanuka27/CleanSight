import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Search,
  Navigation,
  AlertTriangle,
  Clock,
  Info,
  Layers,
  X,
  Loader2,
  Crosshair,
  Image,
  Route,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CleanSightMap } from "@/components/maps/CleanSightMap";
import { RouteOverlay } from "@/components/maps/RouteOverlay";
import { fromGeoJSONPoint, bboxFromViewport } from "@/utils/geo";
import { DEFAULT_CENTER, DEFAULT_ZOOM, VIEWPORT_DEBOUNCE_MS } from "@/constants/map";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import type { MapReportMarker, LatLng, MapViewport } from "@/types/map";

const STATUS_FILTERS = ["All", "pending", "assigned", "resolved"] as const;

const statusBadgeClass: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  assigned: "bg-info/10 text-info border-info/30",
  resolved: "bg-success/10 text-success border-success/30",
};

// ── Skeleton loader ──────────────────────────────────────────────

function ReportCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-14 bg-gray-200 rounded-full" />
          </div>
          <div className="h-3 w-full bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Map Legend ────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200 text-xs">
      <p className="font-semibold text-gray-700 mb-2">Legend</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-warning" />
          <span className="text-gray-600">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-gray-600">Assigned</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-success" />
          <span className="text-gray-600">Resolved</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <span className="text-gray-600">High urgency</span>
        </div>
      </div>
    </div>
  );
}

const MapView = () => {
  const { appUser } = useAuth();
  const role = appUser?.role ?? "citizen";

  // Map viewport
  const [viewport, setViewport] = useState<MapViewport>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });

  // Reports data
  const [reports, setReports] = useState<MapReportMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & UI
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Volunteer route
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [routeTarget, setRouteTarget] = useState<LatLng | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  // Debounced fetch timer
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch reports ────────────────────────────────────────────────

  const fetchReports = useCallback(
    async (statusOverride?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const activeStatus = statusOverride ?? statusFilter;

        const res = await api.listReportsForMap({
          status: activeStatus !== "All" ? [activeStatus] : undefined,
        });

        setReports(res.data);
      } catch (err: any) {
        setError(err.message ?? "Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter]
  );

  // Initial load
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch on filter change
  useEffect(() => {
    fetchReports();
  }, [statusFilter, fetchReports]);

  // Debounced viewport-based refetch
  const handleViewportChange = useCallback(
    (vp: MapViewport) => {
      setViewport(vp);
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = setTimeout(async () => {
        try {
          const bbox = bboxFromViewport(vp);
          const activeStatus = statusFilter !== "All" ? [statusFilter] : undefined;
          const res = await api.listReportsForMap({ bbox, status: activeStatus });
          setReports(res.data);
        } catch {
          // Silently fall back to current data
        }
      }, VIEWPORT_DEBOUNCE_MS);
    },
    [statusFilter]
  );

  // ── Client-side search filtering ─────────────────────────────────

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.description?.toLowerCase().includes(q) ||
        r.wasteType?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  // ── Status counts for filter badges ──────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: reports.length };
    for (const r of reports) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return counts;
  }, [reports]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleReportClick = useCallback(
    (report: MapReportMarker) => {
      const { lat, lng } = fromGeoJSONPoint(report.location);
      setSelectedId(report._id);
      setViewport((prev) => ({
        ...prev,
        center: [lng, lat],
        zoom: 15,
      }));
    },
    []
  );

  const handleShowRoute = useCallback(
    (report: MapReportMarker) => {
      if (!navigator.geolocation) return;
      setRouteInfo(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setRouteTarget(fromGeoJSONPoint(report.location));
        },
        () => {
          // fallback: no route
        }
      );
    },
    []
  );

  const handleClearRoute = useCallback(() => {
    setRouteTarget(null);
    setRouteInfo(null);
  }, []);

  const handleFlyToMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setViewport((prev) => ({
          ...prev,
          center: [loc.lng, loc.lat],
          zoom: 14,
        }));
      },
      () => {}
    );
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Navbar />

      <main className="flex-1 relative pt-20 h-full">
        {/* Map Container */}
        <div className="absolute inset-0 z-0">
          <CleanSightMap
            mode="view"
            reports={filteredReports}
            selectedId={selectedId}
            viewport={viewport}
            onViewportChange={handleViewportChange}
            onSelectReport={(r) => setSelectedId(r._id)}
            showUserLocation
            clusterThreshold={100}
          >
            {/* Route overlay for volunteer */}
            {userLocation && routeTarget && (
              <RouteOverlay
                from={userLocation}
                to={routeTarget}
                onRouteInfo={setRouteInfo}
              />
            )}
          </CleanSightMap>
        </div>

        {/* Map Legend (bottom-left, only when sidebar is closed) */}
        {!isSidebarOpen && <MapLegend />}

        {/* Route Info Banner */}
        <AnimatePresence>
          {routeInfo && routeTarget && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-white rounded-2xl shadow-xl border border-gray-200 px-5 py-3 flex items-center gap-4"
            >
              <Route className="w-5 h-5 text-blue-500" />
              <div className="text-sm">
                <span className="font-bold text-gray-900">{routeInfo.distanceKm} km</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-gray-600">{routeInfo.durationMin} min drive</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleClearRoute}>
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
              style={{ willChange: "transform, opacity" }}
              className="absolute left-4 top-24 bottom-4 w-96 bg-white rounded-3xl p-6 shadow-2xl z-10 flex flex-col gap-5 border border-gray-200"
            >
              {/* Header with count */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-2xl font-bold">Live Reports</h2>
                    {!isLoading && (
                      <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {filteredReports.length}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Real-time waste monitoring
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Fly to me */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs w-fit"
                onClick={handleFlyToMe}
              >
                <Crosshair className="w-3.5 h-3.5" />
                Center on my location
              </Button>

              {/* Search & Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 bg-gray-50 border-gray-200"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((status) => {
                    const count = statusCounts[status] ?? 0;
                    const label = status === "All"
                      ? "All"
                      : status.charAt(0).toUpperCase() + status.slice(1);
                    return (
                      <Badge
                        key={status}
                        variant={statusFilter === status ? "default" : "outline"}
                        className={`cursor-pointer ${
                          statusFilter === status
                            ? "gradient-primary border-transparent text-white"
                            : "hover:bg-primary/10"
                        }`}
                        onClick={() => setStatusFilter(status)}
                      >
                        {label}
                        <span className="ml-1 opacity-70">({count})</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-center py-4 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {/* Skeleton loader */}
                {isLoading && (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <ReportCardSkeleton key={i} />
                    ))}
                  </div>
                )}

                {/* Empty states */}
                {!isLoading && filteredReports.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Info className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    {searchQuery.trim() ? (
                      <p>No reports match "<strong>{searchQuery}</strong>". Try a different search.</p>
                    ) : statusFilter !== "All" ? (
                      <p>No <strong>{statusFilter}</strong> reports found. Try selecting "All".</p>
                    ) : (
                      <p>No reports in this area yet. Zoom out or report an issue!</p>
                    )}
                  </div>
                )}

                {/* Report cards */}
                {!isLoading &&
                  filteredReports.map((report) => (
                    <motion.div
                      key={report._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{ willChange: "transform, opacity" }}
                      onClick={() => handleReportClick(report)}
                      className={`
                        p-3 rounded-xl border transition-all cursor-pointer group
                        ${
                          selectedId === report._id
                            ? "bg-primary/10 border-primary shadow-glow ring-1 ring-primary/20"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        {report.imageUrl ? (
                          <img
                            src={report.imageUrl}
                            alt="Report"
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <Image className="w-5 h-5 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  report.urgency === "high"
                                    ? "bg-destructive animate-pulse"
                                    : report.urgency === "medium"
                                    ? "bg-warning"
                                    : "bg-success"
                                }`}
                              />
                              <span className="font-semibold text-sm capitalize truncate">
                                {report.wasteType}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 flex-shrink-0 ${
                                statusBadgeClass[report.status] ?? ""
                              }`}
                            >
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                            {report.description || "No description"}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeAgo(report.createdAt)}
                            </span>
                            {(role === "volunteer" ||
                              role === "staff" ||
                              role === "admin") && (
                              <button
                                className="text-primary hover:underline text-xs flex items-center gap-1 font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowRoute(report);
                                }}
                              >
                                <Navigation className="w-3 h-3" />
                                Route
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>

              {/* Legend + Action */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                {/* Inline mini legend */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-warning" />Pending</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-400" />Assigned</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-success" />Resolved</span>
                </div>
                <Button
                  className="w-full gradient-primary text-white shadow-glow"
                  onClick={() => (window.location.href = "/report")}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report Issue Here
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Sidebar Button */}
        {!isSidebarOpen && (
          <Button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-24 gradient-primary text-white shadow-glow z-10 rounded-full w-12 h-12 p-0"
          >
            <Layers className="w-6 h-6" />
          </Button>
        )}

        {/* Attribution */}
        <div className="absolute bottom-1 right-1 z-10 text-[9px] text-gray-500/70 bg-white/60 rounded px-1">
          © <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenFreeMap</a>
          {" · "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenStreetMap</a>
        </div>
      </main>
    </div>
  );
};

export default MapView;
