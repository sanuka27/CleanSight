/**
 * volunteerInsights.ts
 * Pure computation helpers for the volunteer dashboard.
 * All functions operate on real DashboardReport data — no mock values.
 */

import type { DashboardReport } from "@/types/dashboard";

/** Returns age label from a createdAt ISO string */
export function reportAge(createdAt: string): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Average task age in hours for a list of reports */
export function avgAgeHours(reports: DashboardReport[]): number | null {
  if (reports.length === 0) return null;
  const totalMs = reports.reduce(
    (sum, r) => sum + (Date.now() - new Date(r.createdAt).getTime()),
    0
  );
  return Math.round(totalMs / reports.length / 3_600_000);
}

/** Tasks completed this month */
export function tasksThisMonth(resolved: DashboardReport[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return resolved.filter(
    (r) => new Date(r.updatedAt ?? r.createdAt) >= monthStart
  ).length;
}

/** Get hours label: "2h", "1d 3h", etc. */
export function hoursLabel(h: number): string {
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  const rem = h % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

/** Get a time-of-day greeting */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Compute distance in km between two lat/lng points (Haversine) */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Get distance label for a report given user location */
export function distanceLabel(
  report: DashboardReport,
  userLat?: number,
  userLng?: number
): string | null {
  if (userLat == null || userLng == null) return null;
  const coords = report.location?.coordinates;
  if (!coords) return null;
  const [lng, lat] = coords;
  const km = haversineKm(userLat, userLng, lat, lng);
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`;
}
