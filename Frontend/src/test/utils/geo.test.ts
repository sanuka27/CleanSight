import { describe, it, expect } from "vitest";
import {
  toGeoJSONPoint,
  fromGeoJSONPoint,
  distanceKm,
  bboxFromViewport,
  reportsToFeatureCollection,
} from "@/utils/geo";

// ── toGeoJSONPoint ────────────────────────────────────────────────────────────

describe("toGeoJSONPoint", () => {
  it("produces a GeoJSON Point with correct type", () => {
    const point = toGeoJSONPoint(19.076, 72.8777);
    expect(point.type).toBe("Point");
  });

  it("stores coordinates as [lng, lat] (GeoJSON order)", () => {
    const point = toGeoJSONPoint(19.076, 72.8777);
    // GeoJSON convention: coordinates = [lng, lat]
    expect(point.coordinates[0]).toBeCloseTo(72.8777); // lng
    expect(point.coordinates[1]).toBeCloseTo(19.076);  // lat
  });

  it("handles negative lat/lng (southern/western hemisphere)", () => {
    const point = toGeoJSONPoint(-22.9068, -43.1729);
    expect(point.coordinates[0]).toBeCloseTo(-43.1729);
    expect(point.coordinates[1]).toBeCloseTo(-22.9068);
  });

  it("handles zero coordinates", () => {
    const point = toGeoJSONPoint(0, 0);
    expect(point.coordinates).toEqual([0, 0]);
  });
});

// ── fromGeoJSONPoint ──────────────────────────────────────────────────────────

describe("fromGeoJSONPoint", () => {
  it("extracts lat/lng from GeoJSON Point format", () => {
    const result = fromGeoJSONPoint({ type: "Point", coordinates: [72.8777, 19.076] });
    expect(result.lat).toBeCloseTo(19.076);
    expect(result.lng).toBeCloseTo(72.8777);
  });

  it("extracts lat/lng from legacy { lat, lng } format", () => {
    const result = fromGeoJSONPoint({ lat: 19.076, lng: 72.8777 });
    expect(result.lat).toBeCloseTo(19.076);
    expect(result.lng).toBeCloseTo(72.8777);
  });

  it("prefers GeoJSON format when both are present", () => {
    const result = fromGeoJSONPoint({
      type: "Point",
      coordinates: [72.8777, 19.076],
      lat: 0,
      lng: 0,
    });
    // GeoJSON coordinates should take precedence
    expect(result.lat).toBeCloseTo(19.076);
    expect(result.lng).toBeCloseTo(72.8777);
  });

  it("falls back to { lat: 0, lng: 0 } for empty object", () => {
    const result = fromGeoJSONPoint({});
    expect(result.lat).toBe(0);
    expect(result.lng).toBe(0);
  });

  it("is a round-trip inverse of toGeoJSONPoint", () => {
    const lat = 28.6139;
    const lng = 77.2090;
    const point = toGeoJSONPoint(lat, lng);
    const recovered = fromGeoJSONPoint(point);
    expect(recovered.lat).toBeCloseTo(lat);
    expect(recovered.lng).toBeCloseTo(lng);
  });
});

// ── distanceKm ────────────────────────────────────────────────────────────────

describe("distanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(distanceKm({ lat: 19.076, lng: 72.8777 }, { lat: 19.076, lng: 72.8777 })).toBeCloseTo(0);
  });

  it("calculates a reasonable distance between Mumbai and Delhi (~1150 km)", () => {
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const delhi = { lat: 28.6139, lng: 77.209 };
    const dist = distanceKm(mumbai, delhi);
    // Haversine should give ~1150-1160 km
    expect(dist).toBeGreaterThan(1100);
    expect(dist).toBeLessThan(1250);
  });

  it("is symmetric (a→b equals b→a)", () => {
    const a = { lat: 19.076, lng: 72.8777 };
    const b = { lat: 28.6139, lng: 77.209 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 4);
  });

  it("handles antipodal points (~20000 km)", () => {
    const northPole = { lat: 90, lng: 0 };
    const southPole = { lat: -90, lng: 0 };
    const dist = distanceKm(northPole, southPole);
    // Half circumference ≈ 20015 km
    expect(dist).toBeGreaterThan(19000);
    expect(dist).toBeLessThan(21000);
  });
});

// ── bboxFromViewport ──────────────────────────────────────────────────────────

describe("bboxFromViewport", () => {
  it("returns an array of exactly 4 numbers", () => {
    const bbox = bboxFromViewport({ center: [72.8777, 19.076], zoom: 12 });
    expect(bbox).toHaveLength(4);
    bbox.forEach((v) => expect(typeof v).toBe("number"));
  });

  it("returns [west, south, east, north] where west < east and south < north", () => {
    const bbox = bboxFromViewport({ center: [0, 0], zoom: 10 });
    const [west, south, east, north] = bbox;
    expect(west).toBeLessThan(east);
    expect(south).toBeLessThan(north);
  });

  it("produces smaller bbox at higher zoom levels", () => {
    const centerLng = 72.8777;
    const centerLat = 19.076;
    const bboxZ10 = bboxFromViewport({ center: [centerLng, centerLat], zoom: 10 });
    const bboxZ15 = bboxFromViewport({ center: [centerLng, centerLat], zoom: 15 });

    const widthZ10 = bboxZ10[2] - bboxZ10[0];
    const widthZ15 = bboxZ15[2] - bboxZ15[0];
    expect(widthZ15).toBeLessThan(widthZ10);
  });

  it("centers the bbox on the given center coordinates", () => {
    const center = [72.8777, 19.076] as [number, number];
    const bbox = bboxFromViewport({ center, zoom: 12 });
    const [west, south, east, north] = bbox;
    const midLng = (west + east) / 2;
    const midLat = (south + north) / 2;
    expect(midLng).toBeCloseTo(center[0], 5);
    expect(midLat).toBeCloseTo(center[1], 5);
  });
});

// ── reportsToFeatureCollection ────────────────────────────────────────────────

describe("reportsToFeatureCollection", () => {
  const makeReport = (overrides = {}) => ({
    _id: "report-1",
    location: { type: "Point" as const, coordinates: [72.8777, 19.076] as [number, number] },
    status: "pending",
    wasteType: "general",
    urgency: "medium",
    title: "Test Report",
    description: "Some waste here",
    imageUrl: "https://example.com/img.jpg",
    ...overrides,
  });

  it("returns a GeoJSON FeatureCollection", () => {
    const fc = reportsToFeatureCollection([makeReport()]);
    expect(fc.type).toBe("FeatureCollection");
    expect(Array.isArray(fc.features)).toBe(true);
  });

  it("produces one feature per report", () => {
    const fc = reportsToFeatureCollection([makeReport(), makeReport({ _id: "report-2" })]);
    expect(fc.features).toHaveLength(2);
  });

  it("returns an empty feature array for empty input", () => {
    const fc = reportsToFeatureCollection([]);
    expect(fc.features).toHaveLength(0);
  });

  it("maps report _id to feature properties.id", () => {
    const fc = reportsToFeatureCollection([makeReport({ _id: "abc123" })]);
    expect(fc.features[0].properties.id).toBe("abc123");
  });

  it("stores geometry as a GeoJSON Point with [lng, lat] order", () => {
    const fc = reportsToFeatureCollection([makeReport()]);
    const geom = fc.features[0].geometry;
    expect(geom.type).toBe("Point");
    // coordinates[0] = lng, coordinates[1] = lat
    expect(geom.coordinates[0]).toBeCloseTo(72.8777);
    expect(geom.coordinates[1]).toBeCloseTo(19.076);
  });

  it("uses default values when optional fields are missing", () => {
    const report = {
      _id: "min-report",
      location: { type: "Point" as const, coordinates: [0, 0] as [number, number] },
    };
    const fc = reportsToFeatureCollection([report]);
    const props = fc.features[0].properties;
    expect(props.status).toBe("pending");
    expect(props.wasteType).toBe("");
    expect(props.urgency).toBe("");
  });
});
