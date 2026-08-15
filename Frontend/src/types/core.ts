/**
 * Core Shared Types
 * 
 * Centralized type definitions used across the application.
 * Feature-specific types should stay in their respective type files.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Role Types (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────

/** Application roles - shared across all modules */
export type AppRole = 'citizen' | 'volunteer' | 'staff' | 'admin';

// ─────────────────────────────────────────────────────────────────────────────
// Report Status Types (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────

/** Base report statuses used in map views */
export type BaseReportStatus = 'pending' | 'assigned' | 'resolved';

/** Extended report statuses used in admin workflows */
export type ExtendedReportStatus =
  | 'pending'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

// ─────────────────────────────────────────────────────────────────────────────
// Waste Types
// ─────────────────────────────────────────────────────────────────────────────

export type WasteType = 'general' | 'recyclable' | 'organic' | 'construction' | 'hazardous';

export type UrgencyLevel = 'low' | 'medium' | 'high';

// ─────────────────────────────────────────────────────────────────────────────
// ML Category Types
// ─────────────────────────────────────────────────────────────────────────────

export type WasteCategoryLabel = 'glass' | 'mixed' | 'paper' | 'plastic' | 'pending' | 'error';

export type WasteCategoryReviewStatus =
  | 'auto_accepted'
  | 'flagged'
  | 'manual_review'
  | 'pending'
  | 'approved'
  | 'overridden'
  | 'rejected';

export type WasteCategoryConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY LOW';

// ─────────────────────────────────────────────────────────────────────────────
// Common GeoJSON Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Bounding box: [west, south, east, north] */
export type BBox = [number, number, number, number];

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Range Types
// ─────────────────────────────────────────────────────────────────────────────

export type DateRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface DateRange {
  from: string; // ISO-8601
  to: string;
}
