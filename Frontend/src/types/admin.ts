// ── Admin Types ─────────────────────────────────────────────────────

export type ReportStatus =
  | 'pending'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export type WasteType = 'general' | 'recyclable' | 'organic' | 'construction' | 'hazardous';
export type UrgencyLevel = 'low' | 'medium' | 'high';
export type AppRole = 'citizen' | 'volunteer' | 'staff' | 'admin';
export type DocumentCategory = 'sop' | 'policy' | 'report' | 'guide' | 'other';
export type FileType = 'pdf' | 'doc' | 'docx' | 'xlsx' | 'csv' | 'image' | 'other';

// ML Phase 2 Category Types
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

export interface CategoryPrediction {
  class: string;
  confidence: number;
}

// ── Report ──────────────────────────────────────────────────────────

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface ReporterProfile {
  firebaseUid: string;
  name: string;
  email: string;
  avatar: string | null;
  reportsSubmitted?: number;
  createdAt?: string;
}

export interface AdminReport {
  _id: string;
  firebaseUid: string;
  title: string | null;
  description: string;
  imageUrl: string;
  location: GeoLocation;
  wasteType: WasteType;
  urgency: UrgencyLevel;
  status: ReportStatus;
  assignedTo: string | null;
  adminNote: string | null;
  rejectionReason: string | null;
  
  // ML Phase 1 fields
  aiReviewStatus?: 'approved' | 'flagged' | 'manual_review' | 'pending' | 'rejected' | 'overridden';
  imageValidationLabel?: 'trash' | 'non-trash' | 'error' | 'pending';
  imageValidationConfidence?: number | null;
  finalValidationDecision?: 'approved' | 'rejected' | 'overridden' | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;

  // ML Phase 2 Category fields
  wasteCategoryPredictedLabel?: WasteCategoryLabel;
  wasteCategoryConfidence?: number | null;
  wasteCategoryEntropy?: number | null;
  wasteCategoryConfidenceLevel?: WasteCategoryConfidenceLevel | null;
  wasteCategoryAllPredictions?: CategoryPrediction[] | null;
  wasteCategoryReviewStatus?: WasteCategoryReviewStatus;
  wasteCategoryFinalLabel?: 'glass' | 'mixed' | 'paper' | 'plastic' | null;
  wasteCategoryReviewedBy?: string | null;
  wasteCategoryReviewedAt?: string | null;
  wasteCategoryReviewNote?: string | null;

  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: ReporterProfile | null;
  assignedVolunteer?: { firebaseUid: string; name: string; email: string } | null;
}

// ── Volunteer ───────────────────────────────────────────────────────

export interface VolunteerStats {
  assigned: number;
  resolved: number;
  inProgress: number;
  completionRate: number;
}

export interface AdminVolunteer {
  _id: string;
  firebaseUid: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  isVerified: boolean;
  reportsSubmitted: number;
  cleanupsCompleted: number;
  createdAt: string;
  volunteerProfile: {
    bio?: string;
    skills?: string[];
    availability?: string;
    isActive: boolean;
    stats?: { totalCleanups: number; reportsResolved: number; rating: number };
  } | null;
  stats: VolunteerStats;
  isActive: boolean;
}

// ── Analytics ───────────────────────────────────────────────────────

export interface OverviewTotals {
  total: number;
  pending: number;
  verified: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  rejected: number;
}

export interface OverviewRates {
  resolutionRate: number;
  assignmentRate: number;
}

export interface WasteTypeStat { wasteType: WasteType; count: number }
export interface UrgencyStat   { urgency: UrgencyLevel; count: number }

export interface AdminAnalyticsOverview {
  totals: OverviewTotals;
  rates: OverviewRates;
  wasteTypes: WasteTypeStat[];
  urgencyBreakdown: UrgencyStat[];
  newUsers: number;
  avgResolutionHours: number | null;
  resolvedCount: number;
}

export interface TrendDataPoint {
  date: string;
  total: number;
  pending?: number;
  verified?: number;
  assigned?: number;
  in_progress?: number;
  resolved?: number;
  rejected?: number;
}

export interface VolunteerPerformance {
  firebaseUid: string;
  user: { firebaseUid: string; name: string; email: string; avatar?: string | null };
  assigned: number;
  resolved: number;
  completionRate: number;
  avgResolutionHours: number | null;
}

// ── Document ────────────────────────────────────────────────────────

export interface AdminDocument {
  _id: string;
  title: string;
  url: string;
  fileType: FileType;
  fileSize: number;
  category: DocumentCategory;
  description: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Settings ────────────────────────────────────────────────────────

export interface SystemSettings {
  _id?: string;
  key: string;
  reportAutoExpiryDays: number;
  mapDefaultRadiusKm: number;
  severityThresholds: {
    lowUrgencyDays: number;
    mediumUrgencyDays: number;
    highUrgencyDays: number;
  };
  allowVolunteerSelfAssign: boolean;
  requireImageForReport: boolean;
  maxReportsPerDay: number;
  updatedAt?: string;
}

// ── Pagination ──────────────────────────────────────────────────────

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

// ── Report Filters ──────────────────────────────────────────────────

export interface ReportFilters {
  status?: string;
  wasteType?: string;
  urgency?: string;
  aiReviewStatus?: string;
  imageValidationLabel?: string;
  wasteCategoryReviewStatus?: string;
  wasteCategoryPredictedLabel?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  from?: string;
  to?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export type DateRange = '7d' | '30d' | '90d' | 'custom';

// ── Audit Log ────────────────────────────────────────────────────────

export type AuditAction =
  | 'REPORT_STATUS_CHANGED'
  | 'REPORT_ASSIGNED'
  | 'REPORT_NOTE_ADDED'
  | 'REPORTS_BULK_ASSIGNED'
  | 'REPORTS_BULK_STATUS_UPDATED'
  | 'REPORTS_BULK_REJECTED'
  | 'REPORTS_BULK_EXPORTED'
  | 'REPORT_ML_REVIEW'
  | 'REPORT_CATEGORY_REVIEW'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  | 'SETTINGS_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_SUSPENDED';

// ── Bulk Actions ─────────────────────────────────────────────────────

export interface BulkActionResult {
  success: boolean;
  updatedCount: number;
  failed: { id: string; reason: string }[];
}

export interface BulkExportFilters {
  status?: string;
  wasteType?: string;
  urgency?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type AuditEntityType = 'report' | 'document' | 'settings' | 'user';

export interface AuditLog {
  _id: string;
  actorUid: string;
  actorEmail: string | null;
  actorRole: 'admin' | 'staff' | 'system';
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: AuditAction | '';
  actorUid?: string;
  entityType?: AuditEntityType | '';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ── User Management ──────────────────────────────────────────────────

export interface AdminUser {
  _id: string;
  firebaseUid: string;
  name: string;
  email: string;
  role: AppRole;
  avatar: string | null;
  phone: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  suspendedReason: string | null;
  suspendedAt: string | null;
  reportsSubmitted: number;
  cleanupsCompleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserStats {
  reportsSubmitted: number;
  tasksCompleted: number | null;
  lastActivity: string | null;
}

export interface AdminUserDetail {
  user: AdminUser;
  stats: AdminUserStats;
}

export interface UserFilters {
  q?: string;
  role?: AppRole | '';
  status?: 'active' | 'suspended' | '';
  sort?: 'newest' | 'oldest' | 'name';
  page?: number;
  limit?: number;
}

// ── Admin Map ────────────────────────────────────────────────────────

/** Lightweight report shape returned by GET /api/admin/reports/map */
export interface AdminMapReport {
  _id: string;
  title: string | null;
  description: string;
  location: GeoLocation;
  status: ReportStatus;
  wasteType: WasteType;
  urgency: UrgencyLevel;
  assignedTo: string | null;
  assignedVolunteer: { firebaseUid: string; name?: string; email?: string } | null;
  createdAt: string;
  imageUrl: string | null;
}

/** Query filters for the admin map endpoint */
export interface AdminMapFilters {
  bbox?: string;         // "west,south,east,north"
  status?: string;       // comma-separated
  wasteType?: string;    // comma-separated
  urgency?: string;      // comma-separated
  unassigned?: boolean;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

