import { useCallback, useMemo, useState } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  MapClusterLayer,
  useMap,
  type MapViewport,
} from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/constants/map";
import { STATUS_CONFIG } from "@/constants/mapUi";
import { fromGeoJSONPoint, reportsToFeatureCollection } from "@/utils/geo";
import { ReportMapMarker } from "@/components/map/MapMarker";
import type { LatLng, MapReportMarker } from "@/types/map";
import type MapLibreGL from "maplibre-gl";

// ── Props ──────────────────────────────────────────────────────────

interface CleanSightMapProps {
  /** "view" = show markers, "pick" = click-to-place-pin */
  mode: "view" | "pick";
  /** Reports to render as markers (view mode) */
  reports?: MapReportMarker[];
  /** Currently picked location (pick mode) */
  pickedLocation?: LatLng | null;
  /** Fires when user clicks the map in pick mode */
  onPickLocation?: (loc: LatLng) => void;
  /** Fires when user clicks a report marker */
  onSelectReport?: (report: MapReportMarker) => void;
  /** ID of the currently-selected report (highlighted on map) */
  selectedId?: string | null;
  /** Optional controlled viewport */
  viewport?: Partial<MapViewport>;
  /** Optional viewport change handler */
  onViewportChange?: (vp: MapViewport) => void;
  /** Show user geolocation control */
  showUserLocation?: boolean;
  /** Enable clustering when reports exceed this count (0 = off) */
  clusterThreshold?: number;
  /** Extra CSS class on the map container */
  className?: string;
  /** Children to render inside the map (e.g. MapRoute overlay) */
  children?: React.ReactNode;
}

// ── Click Handler for Pick Mode ────────────────────────────────────

function PickClickHandler({
  onPickLocation,
}: {
  onPickLocation: (loc: LatLng) => void;
}) {
  const { map } = useMap();

  // Register once
  useState(() => {
    if (!map) return;
    const handler = (e: MapLibreGL.MapMouseEvent) => {
      onPickLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  });

  return null;
}

// ── Main Component ─────────────────────────────────────────────────

export function CleanSightMap({
  mode,
  reports = [],
  pickedLocation,
  onPickLocation,
  onSelectReport,
  selectedId: selectedIdProp,
  viewport,
  onViewportChange,
  showUserLocation = true,
  clusterThreshold = 0,
  className,
  children,
}: CleanSightMapProps) {
  const [selectedIdLocal, setSelectedIdLocal] = useState<string | null>(null);
  // Use controlled selectedId if provided, otherwise local state
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : selectedIdLocal;

  const handleMarkerClick = useCallback(
    (report: MapReportMarker) => {
      setSelectedIdLocal((prev) => (prev === report._id ? null : report._id));
      onSelectReport?.(report);
    },
    [onSelectReport]
  );

  const selectedReport = reports.find((r) => r._id === selectedId);

  // Memoise GeoJSON for clustering
  const useClustering =
    mode === "view" && clusterThreshold > 0 && reports.length >= clusterThreshold;
  const geojson = useMemo(
    () => (useClustering ? reportsToFeatureCollection(reports) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useClustering, reports]
  );

  return (
    <Map
      className={className}
      center={viewport?.center ?? DEFAULT_CENTER}
      zoom={viewport?.zoom ?? DEFAULT_ZOOM}
      viewport={viewport}
      onViewportChange={onViewportChange}
      theme="light"
      styles={{
        light: "https://tiles.openfreemap.org/styles/liberty",
        dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      }}
    >
      {/* Controls */}
      <MapControls
        position="bottom-right"
        showZoom
        showCompass
        showLocate={showUserLocation}
        showFullscreen
      />

      {/* Pick mode: register click handler + show pin */}
      {mode === "pick" && onPickLocation && (
        <PickClickHandler onPickLocation={onPickLocation} />
      )}

      {mode === "pick" && pickedLocation && (
        <MapMarker
          longitude={pickedLocation.lng}
          latitude={pickedLocation.lat}
          draggable
          onDragEnd={(lngLat) =>
            onPickLocation?.({ lat: lngLat.lat, lng: lngLat.lng })
          }
        >
          <MarkerContent>
            <MapPin className="w-8 h-8 text-primary drop-shadow-lg" />
          </MarkerContent>
        </MapMarker>
      )}

      {/* View mode: clustered layer (when reports exceed threshold) */}
      {mode === "view" && useClustering && geojson && (
        <MapClusterLayer
          data={geojson}
          clusterMaxZoom={14}
          clusterRadius={60}
          clusterColors={["#22c55e", "#eab308", "#ef4444"]}
          clusterThresholds={[50, 200]}
          pointColor="#3b82f6"
          onPointClick={(feature, coordinates) => {
            const props = feature.properties;
            if (props?.id) {
              const match = reports.find((r) => r._id === props.id);
              if (match) handleMarkerClick(match);
            }
          }}
        />
      )}

      {/* View mode: individual markers (below threshold or no clustering) */}
      {mode === "view" &&
        !useClustering &&
        reports.map((report) => {
          const { lat, lng } = fromGeoJSONPoint(report.location);
          return (
            <MapMarker
              key={report._id}
              longitude={lng}
              latitude={lat}
              onClick={() => handleMarkerClick(report)}
            >
              <MarkerContent>
                <ReportMapMarker
                  status={report.status}
                  urgency={report.urgency}
                  isSelected={selectedId === report._id}
                />
              </MarkerContent>

              {/* Popup shows on marker click via MapLibre toggle */}
              <MarkerPopup closeButton>
                <div className="min-w-[220px] space-y-2.5 p-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-medium rounded-full px-2 ${
                        STATUS_CONFIG[report.status]?.badgeClass ?? ""
                      }`}
                    >
                      {STATUS_CONFIG[report.status]?.label ?? report.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize font-medium">
                      {report.wasteType}
                    </span>
                  </div>
                  {report.imageUrl && (
                    <img
                      src={report.imageUrl}
                      alt="Report"
                      className="w-full h-28 object-cover rounded-xl ring-1 ring-black/5"
                    />
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/40 hover:shadow-lg"
                    onClick={() => onSelectReport?.(report)}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                </div>
              </MarkerPopup>
            </MapMarker>
          );
        })}

      {/* Allow additional overlays (route lines, etc.) */}
      {children}
    </Map>
  );
}

export default CleanSightMap;
