/* ------------------------------------------------------------------ */
/*  Report status utilities — labels, colors, icons                   */
/* ------------------------------------------------------------------ */

export type ReportStatusValue = "pending" | "assigned" | "resolved";

export interface StatusConfig {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
  dotClass: string;
}

export const STATUS_CONFIG: Record<ReportStatusValue, StatusConfig> = {
  pending: {
    label: "Pending",
    color: "warning",
    bgClass: "bg-warning/10",
    textClass: "text-warning",
    borderClass: "border-warning/20",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    dotClass: "bg-warning",
  },
  assigned: {
    label: "Assigned",
    color: "info",
    bgClass: "bg-info/10",
    textClass: "text-info",
    borderClass: "border-info/20",
    badgeClass: "bg-info/10 text-info border-info/20",
    dotClass: "bg-info",
  },
  resolved: {
    label: "Resolved",
    color: "success",
    bgClass: "bg-success/10",
    textClass: "text-success",
    borderClass: "border-success/20",
    badgeClass: "bg-success/10 text-success border-success/20",
    dotClass: "bg-success",
  },
};

export function getStatusConfig(status: string): StatusConfig {
  return (
    STATUS_CONFIG[status as ReportStatusValue] ?? {
      label: status,
      color: "muted",
      bgClass: "bg-muted/10",
      textClass: "text-muted-foreground",
      borderClass: "border-border",
      badgeClass: "bg-muted/10 text-muted-foreground border-border",
      dotClass: "bg-muted-foreground",
    }
  );
}

export const WASTE_TYPE_LABELS: Record<string, string> = {
  general: "General",
  recyclable: "Recyclable",
  organic: "Organic",
  construction: "Construction",
  hazardous: "Hazardous",
};

export const URGENCY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/* ── GeoJSON location helper ─────────────────────────────────────── */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Extract { lat, lng } from a GeoJSON Point object.
 * The backend stores/returns location as `{ type: "Point", coordinates: [lng, lat] }`.
 * Returns null if the location is missing or malformed.
 */
export function getLatLng(
  location?: { type?: string; coordinates?: [number, number] }
): LatLng | null {
  if (!location?.coordinates || location.coordinates.length < 2) return null;
  return { lat: location.coordinates[1], lng: location.coordinates[0] };
}
