/* ------------------------------------------------------------------ */
/*  Analytics API response types                                      */
/* ------------------------------------------------------------------ */

/** Common date-range object returned by every analytics endpoint. */
export interface DateRange {
  from: string; // ISO-8601
  to: string;
}

/** Status totals. */
export interface StatusTotals {
  total: number;
  pending: number;
  verified: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  rejected: number;
}

/** Rates expressed as percentages 0–100. */
export interface Rates {
  resolutionRate: number;
  assignmentRate: number;
}

/** Single bucket in the time-series. */
export interface SeriesBucket {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Waste type count. */
export interface WasteTypeCount {
  wasteType: string;
  count: number;
}

/** Urgency count. */
export interface UrgencyCount {
  urgency: string;
  count: number;
}

/** Volunteer's own "my assigned" section (only returned for volunteers). */
export interface MyAssigned {
  total: number;
  resolved: number;
  pending: number;
}

/* ------------------------------------------------------------------ */
/*  GET /api/analytics/summary                                        */
/* ------------------------------------------------------------------ */

export interface SummaryResponse {
  success: boolean;
  data: {
    range: DateRange;
    totals: StatusTotals;
    rates: Rates;
    series: SeriesBucket[];
    topWasteTypes: WasteTypeCount[];
    urgencyBreakdown: UrgencyCount[];
    /** Present only when logged-in user is a volunteer. */
    myAssigned?: MyAssigned;
  };
}

/* ------------------------------------------------------------------ */
/*  GET /api/analytics/performance                                    */
/* ------------------------------------------------------------------ */

export interface PerformanceResponse {
  success: boolean;
  data: {
    range: DateRange;
    avgResolutionHours: number | null;
    medianResolutionHours: number | null;
    resolvedCount: number;
    avgTimeToAssignHours: number | null;
    assignedCount: number;
    _note?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  GET /api/analytics/volunteers                                     */
/* ------------------------------------------------------------------ */

export interface VolunteerAnalyticsItem {
  firebaseUid: string;
  name: string;
  email: string | null;
  assignedCount: number;
  resolvedCount: number;
}

export interface VolunteerAnalyticsResponse {
  success: boolean;
  data: {
    range: DateRange;
    volunteers: VolunteerAnalyticsItem[];
  };
}

/* ------------------------------------------------------------------ */
/*  Query parameter helpers                                           */
/* ------------------------------------------------------------------ */

export type AnalyticsPreset = '7d' | '30d' | '90d';

export interface AnalyticsQueryParams {
  preset?: AnalyticsPreset;
  from?: string;
  to?: string;
}
