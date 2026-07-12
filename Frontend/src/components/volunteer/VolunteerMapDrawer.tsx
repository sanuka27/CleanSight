import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CleanSightMap } from "@/components/map/CleanSightMap";
import { RouteOverlay } from "@/components/map/RouteOverlay";
import type { DashboardReport } from "@/types/dashboard";
import type { LatLng, MapReportMarker } from "@/types/map";
import { DEFAULT_NEAR_RADIUS_KM, DEFAULT_ZOOM } from "@/constants/map";

interface VolunteerMapDrawerProps {
  open: boolean;
  onClose: () => void;
  assignedReports: DashboardReport[];
  pendingReports: DashboardReport[];
  nearbyMapReports: MapReportMarker[];
  selectedId?: string | null;
  onSelectReport: (report: MapReportMarker) => void;
  userLocation: LatLng | null;
  routeTo: LatLng | null;
  onClearRoute: () => void;
  isLoading: boolean;
}

function toMapMarker(r: DashboardReport): MapReportMarker | null {
  if (!r.location?.coordinates) return null;
  return {
    _id: r._id,
    description: r.description ?? "",
    status: r.status as MapReportMarker["status"],
    wasteType: r.wasteType,
    urgency: r.urgency,
    imageUrl: r.imageUrl,
    location: r.location,
    createdAt: r.createdAt,
  };
}

export function VolunteerMapDrawer({
  open,
  onClose,
  assignedReports,
  pendingReports,
  nearbyMapReports,
  selectedId,
  onSelectReport,
  userLocation,
  routeTo,
  onClearRoute,
  isLoading,
}: VolunteerMapDrawerProps) {
  // Combine all markers: nearby fetched + assigned and pending with coordinates
  const allMarkers = useMemo(() => {
    const fromDashboard: MapReportMarker[] = [
      ...assignedReports.map(toMapMarker),
      ...pendingReports.map(toMapMarker),
    ].filter((m): m is MapReportMarker => m !== null);

    // Merge: prefer nearbyMapReports (they have full coords) but also show dashboard reports
    const nearbyIds = new Set(nearbyMapReports.map((m) => m._id));
    const extras = fromDashboard.filter((m) => !nearbyIds.has(m._id));
    return [...nearbyMapReports, ...extras];
  }, [nearbyMapReports, assignedReports, pendingReports]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            key="map-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="map-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="glass-premium rounded-2xl border border-white/8 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-base">Near Me Map</h3>
                  {allMarkers.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {allMarkers.length} report{allMarkers.length !== 1 ? "s" : ""} within {DEFAULT_NEAR_RADIUS_KM} km
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {routeTo && (
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={onClearRoute}>
                      <Navigation className="w-3 h-3" />
                      Clear Route
                    </Button>
                  )}
                  <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Map */}
              <div className="h-[420px] relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                    <span className="text-muted-foreground text-sm">Finding nearby reports…</span>
                  </div>
                ) : (
                  <CleanSightMap
                    // Re-mount the map when the user location first arrives so it
                    // initialises at the correct centre rather than at DEFAULT_CENTER.
                    key={userLocation ? `${userLocation.lat},${userLocation.lng}` : "no-loc"}
                    mode="view"
                    reports={allMarkers}
                    selectedId={selectedId}
                    showUserLocation
                    onSelectReport={onSelectReport}
                    className="h-full w-full"
                    clusterThreshold={allMarkers.length > 10 ? 10 : 0}
                    // Center on the user's actual location when available,
                    // so the Near Me Map shows their surroundings, not the default.
                    viewport={
                      userLocation
                        ? { center: [userLocation.lng, userLocation.lat], zoom: DEFAULT_ZOOM + 4 }
                        : undefined
                    }
                  >
                    {userLocation && routeTo && (
                      <RouteOverlay from={userLocation} to={routeTo} />
                    )}
                  </CleanSightMap>
                )}
              </div>

              {/* Route info */}
              {routeTo && (
                <div className="px-5 py-2 border-t border-border/30 text-xs text-muted-foreground flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-primary" />
                  Route to {routeTo.lat.toFixed(4)}, {routeTo.lng.toFixed(4)}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
