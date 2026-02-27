/** Latitude / Longitude pair */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Bounding box: [west, south, east, north] */
export type BBox = [number, number, number, number];

/** Map viewport state (mirrors mapcn MapViewport) */
export interface MapViewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;
}

/** Report status values used across the app */
export type ReportStatus = "pending" | "assigned" | "resolved";

/** Lightweight report shape for map markers.
 *  Supports both GeoJSON and legacy {lat, lng} location formats. */
export interface MapReportMarker {
  _id: string;
  title?: string;
  description: string;
  status: ReportStatus;
  wasteType: string;
  urgency: string;
  imageUrl?: string;
  location: {
    type?: "Point";
    coordinates?: [number, number]; // [lng, lat]
    lat?: number;
    lng?: number;
  };
  createdAt: string;
}

/** Params for listing reports on the map */
export interface MapReportQueryParams {
  status?: string[];
  bbox?: BBox;
  near?: { lat: number; lng: number; radiusKm: number };
  mine?: boolean;
}
