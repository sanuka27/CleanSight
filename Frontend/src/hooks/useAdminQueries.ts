/**
 * Admin React Query Hooks
 * Provides React Query wrappers for admin service functions.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  listAdminReports,
  getAdminReport,
  updateReportStatus,
  reviewAdminReport,
  reviewCategoryReport,
  getCategoryReviewQueue,
  assignReportToVolunteer,
  addReportNote,
  listAdminVolunteers,
  getAdminVolunteer,
  getAdminOverview,
  getAdminTrends,
  getVolunteerPerformance,
  listDocuments,
  createDocument,
  deleteDocument,
  getSettings,
  updateSettings,
  listAuditLogs,
  listAdminUsers,
  getAdminUserDetail,
  updateUserRole,
  updateUserSuspension,
  bulkAssignReports,
  bulkUpdateReportStatus,
  bulkRejectReports,
  fetchAdminMapReports,
  type CategoryReviewQueueFilters,
} from "@/services/admin";
import {
  getMLSummary,
  getPhase1Metrics,
  getPhase2Metrics,
  getMLTrends,
  getWeakPoints,
} from "@/services/mlAnalytics";
import type {
  ReportFilters,
  ReportStatus,
  DateRange,
  AuditLogFilters,
  UserFilters,
  AppRole,
  AdminMapFilters,
} from "@/types/admin";

// ─────────────────────────────────────────────────────────────────────────────
// Reports Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminReportsQuery(filters?: ReportFilters) {
  return useQuery({
    queryKey: queryKeys.admin.reports.list(filters as Record<string, unknown>),
    queryFn: () => listAdminReports(filters),
  });
}

export function useAdminReportDetailQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.reports.detail(id ?? ""),
    queryFn: () => getAdminReport(id!),
    enabled: !!id,
  });
}

export function useCategoryReviewQueueQuery(filters?: CategoryReviewQueueFilters) {
  return useQuery({
    queryKey: queryKeys.admin.reports.categoryQueue(filters as Record<string, unknown>),
    queryFn: () => getCategoryReviewQueue(filters),
  });
}

export function useAdminMapReportsQuery(filters?: AdminMapFilters) {
  return useQuery({
    queryKey: queryKeys.admin.reports.map(filters as Record<string, unknown>),
    queryFn: () => fetchAdminMapReports(filters),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateReportStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: ReportStatus;
      rejectionReason?: string;
    }) => updateReportStatus(id, status, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports.all() });
    },
  });
}

export function useReviewReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      action,
      reviewNote,
    }: {
      id: string;
      action: "approve" | "reject" | "override";
      reviewNote?: string;
    }) => reviewAdminReport(id, action, reviewNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports.all() });
    },
  });
}

export function useReviewCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      action,
      overrideCategory,
      reviewNote,
    }: {
      id: string;
      action: "approve" | "reject" | "override";
      overrideCategory?: "glass" | "mixed" | "paper" | "plastic";
      reviewNote?: string;
    }) => reviewCategoryReport(id, action, overrideCategory, reviewNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports.all() });
    },
  });
}

export function useAssignReportToVolunteerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, volunteerUid }: { id: string; volunteerUid: string }) =>
      assignReportToVolunteer(id, volunteerUid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports.all() });
    },
  });
}

export function useAddReportNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      addReportNote(id, note),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports.detail(id) });
    },
  });
}

export function useBulkAssignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportIds,
      volunteerUid,
      note,
    }: {
      reportIds: string[];
      volunteerUid: string;
      note?: string;
    }) => bulkAssignReports(reportIds, volunteerUid, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports.all() });
    },
  });
}

export function useBulkUpdateStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportIds,
      status,
      rejectionReason,
    }: {
      reportIds: string[];
      status: ReportStatus;
      rejectionReason?: string;
    }) => bulkUpdateReportStatus(reportIds, status, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports.all() });
    },
  });
}

export function useBulkRejectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportIds, reason }: { reportIds: string[]; reason: string }) =>
      bulkRejectReports(reportIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.reports.all() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Volunteers Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminVolunteersQuery(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.admin.volunteers.list(params as Record<string, unknown>),
    queryFn: () => listAdminVolunteers(params ?? {}),
  });
}

export function useAdminVolunteerDetailQuery(
  uid: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.admin.volunteers.detail(uid ?? ""),
    queryFn: () => getAdminVolunteer(uid!),
    enabled: options?.enabled !== false && !!uid,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminOverviewQuery(
  range: DateRange = "7d",
  from?: string,
  to?: string
) {
  return useQuery({
    queryKey: queryKeys.admin.analytics.overview(range, from, to),
    queryFn: () => getAdminOverview(range, from, to),
  });
}

export function useAdminTrendsQuery(
  range: DateRange = "30d",
  from?: string,
  to?: string
) {
  return useQuery({
    queryKey: queryKeys.admin.analytics.trends(range, from, to),
    queryFn: () => getAdminTrends(range, from, to),
  });
}

export function useVolunteerPerformanceQuery(range: DateRange = "30d") {
  return useQuery({
    queryKey: ["admin", "volunteer-performance", range],
    queryFn: () => getVolunteerPerformance(range),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents Queries & Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminDocumentsQuery(category?: string) {
  return useQuery({
    queryKey: queryKeys.admin.documents.list(category),
    queryFn: () => listDocuments(category),
  });
}

export function useCreateDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (doc: {
      title: string;
      url: string;
      fileType?: string;
      fileSize?: number;
      category?: string;
      description?: string;
    }) => createDocument(doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.documents.all() });
    },
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.documents.all() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Queries & Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: getSettings,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs Query
// ─────────────────────────────────────────────────────────────────────────────

export function useAuditLogsQuery(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.admin.auditLogs.list(filters as Record<string, unknown>),
    queryFn: () => listAuditLogs(filters),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Users Queries & Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminUsersQuery(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.admin.users.list(filters as Record<string, unknown>),
    queryFn: () => listAdminUsers(filters),
  });
}

export function useAdminUserDetailQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.users.detail(id ?? ""),
    queryFn: () => getAdminUserDetail(id!),
    enabled: !!id,
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: AppRole }) =>
      updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
    },
  });
}

export function useUpdateUserSuspensionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      isSuspended,
      reason,
    }: {
      id: string;
      isSuspended: boolean;
      reason?: string;
    }) => updateUserSuspension(id, isSuspended, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ML Analytics Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useMLSummaryQuery(preset?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.mlAnalytics.summary({ preset, from, to }),
    queryFn: () => getMLSummary(preset, from, to),
  });
}

export function usePhase1MetricsQuery(preset?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.mlAnalytics.phase1({ preset, from, to }),
    queryFn: () => getPhase1Metrics(preset, from, to),
  });
}

export function usePhase2MetricsQuery(preset?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.mlAnalytics.phase2({ preset, from, to }),
    queryFn: () => getPhase2Metrics(preset, from, to),
  });
}

export function useMLTrendsQuery(preset?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.mlAnalytics.trends({ preset, from, to }),
    queryFn: () => getMLTrends(preset, from, to),
  });
}

export function useWeakPointsQuery(preset?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.mlAnalytics.weakPoints({ preset, from, to }),
    queryFn: () => getWeakPoints(preset, from, to),
  });
}
