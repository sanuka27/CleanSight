import type { MapViewport, MapReportMarker } from "@/types/map";
import { fromGeoJSONPoint } from "@/utils/geo";

/**
 * Build a viewport centered on a report, with a smooth zoom level.
 */
export function viewportForReport(
  report: MapReportMarker,
  currentViewport: MapViewport,
  targetZoom = 15
): MapViewport {
  const { lat, lng } = fromGeoJSONPoint(report.location);
  return {
    ...currentViewport,
    center: [lng, lat],
    zoom: Math.max(currentViewport.zoom, targetZoom),
  };
}

/**
 * Scroll a list item into view by report ID (smooth behavior).
 */
export function scrollReportIntoView(reportId: string) {
  const escapedId = CSS.escape(reportId);
  const element = document.querySelector(`[data-report-id="${escapedId}"]`);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }
}

/**
 * Time-ago formatter (compact).
 */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * Format coordinates to short display string.
 */
export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}
