import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCcw, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CleanSightMap } from "@/components/maps/CleanSightMap";
import { AdminMapFilters } from "@/components/admin/map/AdminMapFilters";
import { AdminMapStats } from "@/components/admin/map/AdminMapStats";
import { AdminReportDrawer } from "@/components/admin/map/AdminReportDrawer";
import { fetchAdminMapReports, listAdminVolunteers } from "@/services/admin";
import type { AdminMapFilters as MapFilters, AdminMapReport } from "@/types/admin";
import type { MapViewport, MapReportMarker } from "@/types/map";
import { bboxFromViewport } from "@/utils/geo";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/constants/map";

const DEBOUNCE_MS = 400;

const EMPTY_FILTERS: MapFilters = {};

export default function AdminMapView() {
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [viewport, setViewport] = useState<MapViewport>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });
  const [selectedReport, setSelectedReport] = useState<AdminMapReport | null>(null);

  // Debounced bbox ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedBbox, setDebouncedBbox] = useState<string>("");

  // Compute bbox from viewport with debounce
  const handleViewportChange = useCallback((vp: MapViewport) => {
    setViewport(vp);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const bbox = bboxFromViewport(vp);
      setDebouncedBbox(bbox.join(","));
    }, DEBOUNCE_MS);
  }, []);

  // Initial bbox
  useEffect(() => {
    const bbox = bboxFromViewport(viewport);
    setDebouncedBbox(bbox.join(","));

    // Cleanup debounced timeout on unmount
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Queries ──────────────────────────────────────────────────────
  const queryKey = useMemo(
    () => ["admin-map-reports", { ...filters, bbox: debouncedBbox }],
    [filters, debouncedBbox]
  );

  const {
    data: mapData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () =>
      fetchAdminMapReports({ ...filters, bbox: debouncedBbox || undefined }),
    enabled: !!debouncedBbox,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const reports: AdminMapReport[] = mapData?.data ?? [];

  // Volunteers for assignment dropdown
  const { data: volData } = useQuery({
    queryKey: ["admin-volunteers-list"],
    queryFn: () => listAdminVolunteers({ limit: 200 }),
    staleTime: 5 * 60_000,
  });
  const volunteers = volData?.data ?? [];

  // ── Map markers ──────────────────────────────────────────────────
  // Convert AdminMapReport[] to MapReportMarker[] for CleanSightMap

  const mapAdminStatusToMapStatus = (
    status: AdminMapReport["status"]
  ): MapReportMarker["status"] => {
    switch (status) {
      case "pending":
      case "assigned":
      case "resolved":
        return status;
      case "verified":
        return "resolved";
      case "in_progress":
        return "assigned";
      case "rejected":
        return "resolved";
      default:
        return "pending";
    }
  };

  const mapMarkers: MapReportMarker[] = useMemo(
    () =>
      reports.map((r) => ({
        _id: r._id,
        title: r.title ?? undefined,
        description: r.description,
        status: mapAdminStatusToMapStatus(r.status),
        wasteType: r.wasteType,
        urgency: r.urgency,
        imageUrl: r.imageUrl ?? undefined,
        location: r.location,
        createdAt: r.createdAt,
      })),
    [reports]
  );

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSelectReport = useCallback(
    (marker: MapReportMarker) => {
      const match = reports.find((r) => r._id === marker._id);
      setSelectedReport(match ?? null);
    },
    [reports]
  );

  const handleReportUpdated = useCallback(() => {
    // Refresh map data and re-fetch selected report details
    queryClient.invalidateQueries({ queryKey: ["admin-map-reports"] });
    // Close drawer (the user will see the marker update)
    setSelectedReport(null);
  }, [queryClient]);

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSelectedReport(null);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-map-reports"] });
  }, [queryClient]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border/60 bg-card/80 backdrop-blur-md px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-sm">
              <MapIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Admin Map View</h1>
              <p className="text-xs text-muted-foreground">
                Operations overview • Real-time report management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AdminMapStats reports={reports} />
            <div className="h-6 w-px bg-border/60 mx-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-lg"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 rounded-lg"
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left: Filters + Map */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Filters */}
          <div className="shrink-0 px-4 py-3">
            <AdminMapFilters
              filters={filters}
              onChange={setFilters}
              onReset={handleReset}
            />
          </div>

          {/* Map */}
          <div className="flex-1 relative min-h-0">
            {isLoading && !mapData && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading reports…</p>
                </div>
              </div>
            )}
            <CleanSightMap
              mode="view"
              reports={mapMarkers}
              selectedId={selectedReport?._id ?? null}
              onSelectReport={handleSelectReport}
              viewport={viewport}
              onViewportChange={handleViewportChange}
              clusterThreshold={30}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Right: Report drawer */}
        {selectedReport && (
          <AdminReportDrawer
            mapReport={selectedReport}
            volunteers={volunteers}
            onClose={() => setSelectedReport(null)}
            onUpdated={handleReportUpdated}
          />
        )}
      </div>
    </div>
  );
}
