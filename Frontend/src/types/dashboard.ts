/* ------------------------------------------------------------------ */
/*  Dashboard API response types                                      */
/* ------------------------------------------------------------------ */

import type { DateRange, StatusTotals, Rates, SeriesBucket, WasteTypeCount, UrgencyCount } from "./analytics";
import type { GeoJSONPoint } from "./core";

/* ── Shared ──────────────────────────────────────────────────────── */

// Re-export GeoJSONPoint for backwards compatibility
export type { GeoJSONPoint };

export interface DashboardReport {
  _id: string;
  title?: string;
  status: string;
  wasteType: string;
  urgency: string;
  createdAt: string;
  updatedAt?: string;
  imageUrl?: string;
  description?: string;
  location?: GeoJSONPoint;
  firebaseUid?: string;
  assignedTo?: string | null;
}

/* ── Citizen Dashboard ───────────────────────────────────────────── */

export interface CitizenDashboardData {
  myTotals: StatusTotals;
  recentReports: DashboardReport[];
}

export interface CitizenDashboardResponse {
  success: boolean;
  data: CitizenDashboardData;
}

/* ── Volunteer Dashboard ─────────────────────────────────────────── */

export interface VolunteerMyStats {
  assignedCount: number;
  resolvedCount: number;
}

export interface VolunteerDashboardData {
  assignedToMe: DashboardReport[];
  resolvedByMe: DashboardReport[];
  pendingNearby: DashboardReport[];
  myStats: VolunteerMyStats;
}

export interface VolunteerDashboardResponse {
  success: boolean;
  data: VolunteerDashboardData;
}

/* ── Staff Dashboard ─────────────────────────────────────────────── */

export interface VolunteerSnapshot {
  firebaseUid: string;
  name: string;
  email: string | null;
  resolvedCount: number;
}

export interface AvailableVolunteer {
  firebaseUid: string;
  name: string;
  email: string;
}

export interface StaffDashboardData {
  pendingReports: DashboardReport[];
  assignedReports: DashboardReport[];
  resolvedTodayCount: number;
  volunteerSnapshot: VolunteerSnapshot[];
  availableVolunteers: AvailableVolunteer[];
}

export interface StaffDashboardResponse {
  success: boolean;
  data: StaffDashboardData;
}

/* ── Admin Dashboard ─────────────────────────────────────────────── */

export interface AdminVolunteer {
  firebaseUid: string;
  name: string;
  email: string | null;
  assignedCount: number;
  resolvedCount: number;
}

export interface AdminPerformance {
  avgResolutionHours: number | null;
  medianResolutionHours: number | null;
  resolvedCount: number;
  avgTimeToAssignHours: number | null;
  assignedCount: number;
}

export interface AdminDashboardData {
  range: DateRange;
  totals: StatusTotals;
  rates: Rates;
  series: SeriesBucket[];
  topWasteTypes: WasteTypeCount[];
  urgencyBreakdown: UrgencyCount[];
  performance: AdminPerformance;
  volunteers: AdminVolunteer[];
  recentReports: DashboardReport[];
  userCounts: { totalUsers: number; totalVolunteers: number };
}

export interface AdminDashboardResponse {
  success: boolean;
  data: AdminDashboardData;
}

/* ── Dashboard /me ───────────────────────────────────────────────── */

export interface DashboardMeResponse {
  success: boolean;
  data: {
    role: string;
    dashboardPath: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };
}
