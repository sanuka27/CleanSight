/**
 * volunteerFilters.ts
 * Filter, sort, and search helpers for volunteer dashboard task/report lists.
 */

import type { DashboardReport } from "@/types/dashboard";
import { haversineKm } from "./volunteerInsights";

export type SortOption = "newest" | "oldest" | "urgent" | "nearest";
export type UrgencyLevel = "low" | "medium" | "high";

export interface TaskFilters {
  search: string;
  wasteType: string;
  urgency: string;
  sort: SortOption;
}

export interface ReportFilters {
  wasteType: string;
  urgency: string;
  sort: SortOption;
  nearMe: boolean;
}

const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

function byUrgency(a: DashboardReport, b: DashboardReport): number {
  return (
    (urgencyOrder[a.urgency?.toLowerCase()] ?? 3) -
    (urgencyOrder[b.urgency?.toLowerCase()] ?? 3)
  );
}

function byNewest(a: DashboardReport, b: DashboardReport): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function byOldest(a: DashboardReport, b: DashboardReport): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function applyTaskFilters(
  reports: DashboardReport[],
  filters: TaskFilters
): DashboardReport[] {
  let result = [...reports];

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.description?.toLowerCase().includes(q) ||
        r.wasteType?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q)
    );
  }
  if (filters.wasteType) {
    result = result.filter(
      (r) => r.wasteType?.toLowerCase() === filters.wasteType.toLowerCase()
    );
  }
  if (filters.urgency) {
    result = result.filter(
      (r) => r.urgency?.toLowerCase() === filters.urgency.toLowerCase()
    );
  }

  if (filters.sort === "newest") result.sort(byNewest);
  else if (filters.sort === "oldest") result.sort(byOldest);
  else if (filters.sort === "urgent") result.sort(byUrgency);

  return result;
}

export function applyReportFilters(
  reports: DashboardReport[],
  filters: ReportFilters,
  userLat?: number,
  userLng?: number
): DashboardReport[] {
  let result = [...reports];

  if (filters.wasteType) {
    result = result.filter(
      (r) => r.wasteType?.toLowerCase() === filters.wasteType.toLowerCase()
    );
  }
  if (filters.urgency) {
    result = result.filter(
      (r) => r.urgency?.toLowerCase() === filters.urgency.toLowerCase()
    );
  }
  if (filters.nearMe && userLat != null && userLng != null) {
    result = result.filter((r) => {
      const coords = r.location?.coordinates;
      if (!coords) return false;
      const [lng, lat] = coords;
      return haversineKm(userLat, userLng, lat, lng) <= 10;
    });
  }

  if (filters.sort === "newest") result.sort(byNewest);
  else if (filters.sort === "oldest") result.sort(byOldest);
  else if (filters.sort === "urgent") result.sort(byUrgency);
  else if (filters.sort === "nearest" && userLat != null && userLng != null) {
    result.sort((a, b) => {
      const ca = a.location?.coordinates;
      const cb = b.location?.coordinates;
      if (!ca || !cb) return 0;
      const da = haversineKm(userLat, userLng, ca[1], ca[0]);
      const db = haversineKm(userLat, userLng, cb[1], cb[0]);
      return da - db;
    });
  }

  return result;
}

/** Get unique waste types from a list of reports */
export function uniqueWasteTypes(reports: DashboardReport[]): string[] {
  const set = new Set(reports.map((r) => r.wasteType).filter(Boolean));
  return Array.from(set).sort();
}
