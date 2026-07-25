import { describe, it, expect } from "vitest";
import {
  getStatusConfig,
  getLatLng,
  STATUS_CONFIG,
  WASTE_TYPE_LABELS,
  URGENCY_LABELS,
} from "@/utils/reportStatus";

// ── getStatusConfig ───────────────────────────────────────────────────────────

describe("getStatusConfig", () => {
  it("returns correct config for 'pending'", () => {
    const config = getStatusConfig("pending");
    expect(config.label).toBe("Pending");
    expect(config.color).toBe("warning");
    expect(config.bgClass).toContain("warning");
    expect(config.dotClass).toBe("bg-warning");
  });

  it("returns correct config for 'assigned'", () => {
    const config = getStatusConfig("assigned");
    expect(config.label).toBe("Assigned");
    expect(config.color).toBe("info");
  });

  it("returns correct config for 'resolved'", () => {
    const config = getStatusConfig("resolved");
    expect(config.label).toBe("Resolved");
    expect(config.color).toBe("success");
  });

  it("returns a fallback config for unknown statuses", () => {
    const config = getStatusConfig("unknown_status");
    // Label should be the raw status string for unknown values
    expect(config.label).toBe("unknown_status");
    expect(config.color).toBe("muted");
    expect(config.textClass).toBe("text-muted-foreground");
  });

  it("returns a fallback config for empty string", () => {
    const config = getStatusConfig("");
    expect(config.color).toBe("muted");
  });

  it("STATUS_CONFIG covers all three known statuses", () => {
    expect(Object.keys(STATUS_CONFIG)).toEqual(
      expect.arrayContaining(["pending", "assigned", "resolved"])
    );
  });
});

// ── getLatLng ─────────────────────────────────────────────────────────────────

describe("getLatLng", () => {
  it("extracts lat/lng from a valid GeoJSON Point (backend format)", () => {
    const result = getLatLng({
      type: "Point",
      coordinates: [72.8777, 19.076], // [lng, lat]
    });
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(19.076);
    expect(result!.lng).toBeCloseTo(72.8777);
  });

  it("returns null for undefined location", () => {
    expect(getLatLng(undefined)).toBeNull();
  });

  it("returns null for missing coordinates", () => {
    expect(getLatLng({ type: "Point" })).toBeNull();
  });

  it("returns null for empty coordinates array", () => {
    expect(getLatLng({ type: "Point", coordinates: [] as unknown as [number, number] })).toBeNull();
  });

  it("returns null for a single-element coordinates array", () => {
    expect(
      getLatLng({ type: "Point", coordinates: [72.8] as unknown as [number, number] })
    ).toBeNull();
  });

  it("handles negative coordinates (southern/western hemisphere)", () => {
    const result = getLatLng({ type: "Point", coordinates: [-43.1729, -22.9068] });
    expect(result!.lat).toBeCloseTo(-22.9068);
    expect(result!.lng).toBeCloseTo(-43.1729);
  });

  it("handles zero coordinates", () => {
    const result = getLatLng({ type: "Point", coordinates: [0, 0] });
    expect(result!.lat).toBe(0);
    expect(result!.lng).toBe(0);
  });
});

// ── WASTE_TYPE_LABELS ─────────────────────────────────────────────────────────

describe("WASTE_TYPE_LABELS", () => {
  const expectedTypes = ["general", "recyclable", "organic", "construction", "hazardous"];

  it("contains all valid waste types", () => {
    expectedTypes.forEach((type) => {
      expect(WASTE_TYPE_LABELS).toHaveProperty(type);
    });
  });

  it("all values are non-empty strings", () => {
    Object.values(WASTE_TYPE_LABELS).forEach((label) => {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it("'general' maps to 'General'", () => {
    expect(WASTE_TYPE_LABELS.general).toBe("General");
  });

  it("'hazardous' maps to 'Hazardous'", () => {
    expect(WASTE_TYPE_LABELS.hazardous).toBe("Hazardous");
  });
});

// ── URGENCY_LABELS ────────────────────────────────────────────────────────────

describe("URGENCY_LABELS", () => {
  it("contains low, medium, and high keys", () => {
    expect(URGENCY_LABELS).toHaveProperty("low");
    expect(URGENCY_LABELS).toHaveProperty("medium");
    expect(URGENCY_LABELS).toHaveProperty("high");
  });

  it("'high' maps to 'High'", () => {
    expect(URGENCY_LABELS.high).toBe("High");
  });

  it("all urgency values are non-empty capitalised strings", () => {
    Object.values(URGENCY_LABELS).forEach((label) => {
      expect(label.length).toBeGreaterThan(0);
      expect(label[0]).toBe(label[0].toUpperCase());
    });
  });
});
