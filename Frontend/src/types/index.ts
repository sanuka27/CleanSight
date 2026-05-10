/**
 * Types Index
 * Re-export commonly used types from a single location.
 */

// Core shared types
export type {
  AppRole,
  BaseReportStatus,
  ExtendedReportStatus,
  WasteType,
  UrgencyLevel,
  GeoJSONPoint,
  LatLng,
  BBox,
  Pagination,
  PaginatedResponse,
  DateRangePreset,
  WasteCategoryLabel,
  WasteCategoryReviewStatus,
  WasteCategoryConfidenceLevel,
} from './core';

// Map types
export type {
  MapViewport,
  ReportStatus,
  MapReportMarker,
  MapReportQueryParams,
} from './map';

// Dashboard types
export type {
  DashboardReport,
  CitizenDashboardData,
  CitizenDashboardResponse,
  CitizenBadge,
  CitizenBadgeCriteria,
  CitizenBadgeDefinition,
  CitizenProfileSummary,
  VolunteerDashboardData,
  VolunteerDashboardResponse,
  VolunteerBadge,
  VolunteerBadgeCriteria,
  VolunteerBadgeDefinition,
  VolunteerProfileSummary,
  StaffDashboardData,
  StaffDashboardResponse,
  AdminDashboardData,
  AdminDashboardResponse,
  DashboardMeResponse,
  AvailableVolunteer,
} from './dashboard';

// Analytics types
export type {
  AnalyticsPreset,
  AnalyticsQueryParams,
  StatusTotals,
  Rates,
  SeriesBucket,
  WasteTypeCount,
  UrgencyCount,
  SummaryData,
  SummaryResponse,
  PerformanceData,
  PerformanceResponse,
  VolunteerMetric,
  VolunteerAnalyticsData,
  VolunteerAnalyticsResponse,
} from './analytics';

// Admin types
export type {
  AdminReport,
  AdminVolunteer,
  AdminUser,
  AdminUserDetail,
  ReportFilters,
  UserFilters,
  AdminMapReport,
  AdminMapFilters,
  AdminAnalyticsOverview,
  TrendDataPoint,
  VolunteerPerformance,
  AdminDocument,
  SystemSettings,
  AuditLog,
  AuditLogFilters,
  DateRange,
  DocumentCategory,
  FileType,
  BulkActionResult,
  BulkExportFilters,
} from './admin';

// ML Analytics types
export type {
  DateRangeFilter,
  MLSummary,
  Phase1Stats,
  Phase2Stats,
  TrendPoint,
  WeakPoint,
  ConfidenceDistribution,
  MLSummaryResponse,
  Phase1Response,
  Phase2Response,
  TrendsResponse,
  WeakPointsResponse,
  ConfidenceResponse,
} from './mlAnalytics';
