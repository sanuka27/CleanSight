import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Layers, Route, X, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CleanSightMap } from "@/components/maps/CleanSightMap";
import { RouteOverlay } from "@/components/maps/RouteOverlay";
import { fromGeoJSONPoint, bboxFromViewport } from "@/utils/geo";
import { DEFAULT_CENTER, DEFAULT_ZOOM, VIEWPORT_DEBOUNCE_MS } from "@/constants/map";
import { URGENCY_CONFIG, LEGEND_ITEMS } from "@/constants/mapUi";
import type { StatusFilterValue, SortValue } from "@/constants/mapUi";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { MapReportMarker, LatLng, MapViewport } from "@/types/map";
import { LiveReportsPanel } from "@/components/map/LiveReportsPanel";
import { scrollReportIntoView } from "@/utils/mapSelection";

// ── Map Legend (shown when sidebar is closed) ────────────────────

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-white/50 text-xs">
      <p className="font-semibold text-gray-700 mb-2">Legend</p>
      <div className="flex flex-col gap-1.5">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <MapPin className={`w-3.5 h-3.5 ${item.color}`} />
            <span className="text-gray-600">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-gray-600">High urgency</span>
        </div>
      </div>
    </div>
  );
}

const MapView = () => {
  const { appUser } = useAuth();
  const { toast } = useToast();
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
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("newest");
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
        const msg = err.message ?? "Failed to load reports";
        setError(msg);
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, toast]
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

  // ── Client-side search + sort filtering ──────────────────────────

  const filteredReports = useMemo(() => {
    let result = reports;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.description?.toLowerCase().includes(q) ||
          r.wasteType?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "urgency") {
        const getOrder = (u: string) => (URGENCY_CONFIG[u]?.order ?? 99);
        return getOrder(a.urgency) - getOrder(b.urgency);
      }
      return 0;
    });

    return result;
  }, [reports, searchQuery, sortBy]);

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
        zoom: Math.max(prev.zoom, 15),
      }));
    },
    []
  );

  const handleMarkerSelect = useCallback(
    (report: MapReportMarker) => {
      setSelectedId(report._id);
      // Scroll list to this item
      scrollReportIntoView(report._id);
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
          toast({ title: "Location unavailable", description: "Could not get your location.", variant: "destructive" });
        }
      );
    },
    [toast]
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
      () => {
        toast({ title: "Location unavailable", description: "Could not get your location.", variant: "destructive" });
      }
    );
  }, [toast]);

  const handleReportIssue = useCallback(() => {
    window.location.href = "/report";
  }, []);

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
            onSelectReport={handleMarkerSelect}
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
              className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 px-5 py-3 flex items-center gap-4"
            >
              <Route className="w-5 h-5 text-emerald-500" />
              <div className="text-sm">
                <span className="font-bold text-gray-900">{routeInfo.distanceKm} km</span>
                <span className="text-gray-300 mx-2">·</span>
                <span className="text-gray-600">{routeInfo.durationMin} min drive</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={handleClearRoute}>
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Sidebar — Redesigned Live Reports Panel */}
        <AnimatePresence>
          {isSidebarOpen && (
            <LiveReportsPanel
              reports={filteredReports}
              isLoading={isLoading}
              error={error}
              selectedId={selectedId}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              sortBy={sortBy}
              statusCounts={statusCounts}
              role={role}
              onClose={() => setSidebarOpen(false)}
              onSelectReport={handleReportClick}
              onStatusFilterChange={setStatusFilter}
              onSearchChange={setSearchQuery}
              onSortChange={setSortBy}
              onFlyToMe={handleFlyToMe}
              onReportIssue={handleReportIssue}
              onShowRoute={handleShowRoute}
            />
          )}
        </AnimatePresence>

        {/* Toggle Sidebar Button */}
        {!isSidebarOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
          >
            <Button
              onClick={() => setSidebarOpen(true)}
              className="absolute left-4 top-24 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-200/40 z-10 rounded-2xl w-12 h-12 p-0 hover:shadow-2xl hover:shadow-emerald-200/60 transition-shadow"
            >
              <Layers className="w-5 h-5" />
            </Button>
          </motion.div>
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
