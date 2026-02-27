import type { LatLng, BBox, MapViewport } from "@/types/map";

/**
 * Convert lat/lng to a GeoJSON Point object.
 */
export function toGeoJSONPoint(lat: number, lng: number) {
  return {
    type: "Point" as const,
    coordinates: [lng, lat] as [number, number],
  };
}

/**
 * Extract lat/lng from a GeoJSON Point OR a legacy {lat, lng} object.
 * Handles both formats for backward compatibility with existing DB records.
 */
export function fromGeoJSONPoint(point: {
  type?: "Point";
  coordinates?: [number, number];
  lat?: number;
  lng?: number;
}): LatLng {
  // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
  if (point.coordinates && point.coordinates.length >= 2) {
    return { lat: point.coordinates[1], lng: point.coordinates[0] };
  }
  // Legacy format: { lat, lng }
  if (point.lat !== undefined && point.lng !== undefined) {
    return { lat: point.lat, lng: point.lng };
  }
  // Fallback
  return { lat: 0, lng: 0 };
}

/**
 * Derive a BBox [west, south, east, north] from a MapViewport.
 * Uses approximate bounds from center + zoom.
 */
export function bboxFromViewport(viewport: MapViewport): BBox {
  const [lng, lat] = viewport.center;
  // Rough degrees-per-pixel at this zoom
  const degreesPerTile = 360 / Math.pow(2, viewport.zoom);
  // Assuming ~512px container (conservative estimate)
  const halfWidth = (degreesPerTile * 4) / 2;
  const halfHeight = (degreesPerTile * 3) / 2;

  return [
    lng - halfWidth, // west
    lat - halfHeight, // south
    lng + halfWidth, // east
    lat + halfHeight, // north
  ];
}

/**
 * Haversine distance in kilometers between two LatLng points.
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Convert an array of MapReportMarkers to a GeoJSON FeatureCollection
 * for use with MapClusterLayer. Handles both GeoJSON and legacy locations.
 */
export function reportsToFeatureCollection(
  reports: Array<{
    _id: string;
    location: { type?: "Point"; coordinates?: [number, number]; lat?: number; lng?: number };
    status?: string;
    wasteType?: string;
    urgency?: string;
    title?: string;
    description?: string;
    imageUrl?: string;
  }>
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: reports.map((r) => {
      const { lat, lng } = fromGeoJSONPoint(r.location);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [lng, lat] as [number, number],
        },
        properties: {
          id: r._id,
          status: r.status ?? "pending",
          wasteType: r.wasteType ?? "",
          urgency: r.urgency ?? "",
          title: r.title ?? "",
          description: r.description ?? "",
          imageUrl: r.imageUrl ?? "",
        },
      };
    }),
  };
}
