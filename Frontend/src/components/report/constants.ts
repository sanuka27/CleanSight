import { Trash2, Recycle, Leaf, Building2 } from "lucide-react";

/* ── Waste type options ─────────────────────────────────────────── */

export const wasteTypes = [
  { id: "general", label: "General Waste", icon: Trash2, color: "text-gray-500", bg: "bg-gray-500/10" },
  { id: "recyclable", label: "Recyclables", icon: Recycle, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "organic", label: "Organic/Garden", icon: Leaf, color: "text-green-500", bg: "bg-green-500/10" },
  { id: "construction", label: "Construction", icon: Building2, color: "text-orange-500", bg: "bg-orange-500/10" },
];

/* ── Urgency level options ──────────────────────────────────────── */

export const urgencyLevels = [
  { id: "low", label: "Low", desc: "No immediate hazard", color: "bg-success/10 text-success border-success/30" },
  { id: "medium", label: "Medium", desc: "Needs attention soon", color: "bg-warning/10 text-warning border-warning/30" },
  { id: "high", label: "High", desc: "Hazardous / Blocking", color: "bg-destructive/10 text-destructive border-destructive/30" },
];

/* ── Step definitions ───────────────────────────────────────────── */

export const steps = [
  { id: 1, title: "Photo", desc: "Upload evidence" },
  { id: 2, title: "Details", desc: "Type & urgency" },
  { id: 3, title: "Location", desc: "Pin the spot" },
];

/* ── Limits ─────────────────────────────────────────────────────── */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/* ── Helpers ────────────────────────────────────────────────────── */

/** Format a lat/lng pair into a human-readable coordinate string. */
export const fmtCoord = (loc: { lat: number; lng: number }) =>
  `${Math.abs(loc.lat).toFixed(5)}° ${loc.lat >= 0 ? "N" : "S"}, ${Math.abs(loc.lng).toFixed(5)}° ${loc.lng >= 0 ? "E" : "W"}`;

/** Validate lat/lng ranges. Returns `{ valid, error }`. */
export const isLocationInRange = (
  loc: { lat: number; lng: number } | null,
): { valid: boolean; error: string | null } => {
  if (!loc) return { valid: false, error: null };
  if (loc.lat < -90 || loc.lat > 90)
    return { valid: false, error: "Latitude must be between −90 and 90" };
  if (loc.lng < -180 || loc.lng > 180)
    return { valid: false, error: "Longitude must be between −180 and 180" };
  return { valid: true, error: null };
};
