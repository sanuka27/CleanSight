/**
 * Reports React Query Hooks
 * Replaces manual useState/useCallback fetching with React Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { queryKeys } from '@/lib/queryKeys';
import type { MapReportMarker, MapReportQueryParams } from '@/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ReportLocation {
  lat: number;
  lng: number;
}

export interface Report {
  _id: string;
  firebaseUid: string;
  imageUrl: string;
  description: string;
  location: ReportLocation;
  wasteType: string;
  urgency: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
}

interface CreateReportParams {
  file: File;
  description: string;
  location: ReportLocation;
  wasteType?: string;
  urgency?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch the current user's reports */
export function useMyReportsQuery() {
  return useQuery({
    queryKey: queryKeys.reports.myReports(),
    queryFn: async (): Promise<Report[]> => {
      const res = await api.getMyReports();
      return res.data;
    },
  });
}

/** Fetch all reports (role-based: citizens see own, others see all) */
export function useReportsListQuery() {
  return useQuery({
    queryKey: queryKeys.reports.lists(),
    queryFn: async (): Promise<Report[]> => {
      const res = await api.getReports();
      return res.data;
    },
  });
}

/** Fetch reports for map view with filters */
export function useMapReportsQuery(params?: MapReportQueryParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.mapReports(params as Record<string, unknown>),
    queryFn: async (): Promise<MapReportMarker[]> => {
      const res = await api.listReportsForMap(params);
      return res.data;
    },
    // Map data can be slightly stale without issues
    staleTime: 30 * 1000, // 30 seconds
    enabled,
  });
}

/** Fetch a single report by ID */
export function useReportDetailQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.reports.detail(id ?? ''),
    queryFn: async () => {
      if (!id) throw new Error('Report ID required');
      const res = await api.getReportById(id);
      return res.data;
    },
    enabled: !!id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/** Create a new report (upload image + submit) */
export function useCreateReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      description,
      location,
      wasteType,
      urgency,
    }: CreateReportParams): Promise<Report> => {
      // Upload image to Firebase Storage
      const imageUrl = await uploadImage(file);

      // Send report to backend
      const response = await api.createReport({
        imageUrl,
        description,
        location,
        wasteType,
        urgency,
      });

      return response.data;
    },
    onSuccess: () => {
      // Invalidate all report queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      // Also invalidate dashboard since report counts change
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.refetchQueries({ queryKey: queryKeys.dashboard.all, type: "all" });
    },
  });
}

/** Volunteer self-assigns a pending report */
export function useAssignSelfMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string): Promise<Report> => {
      const response = await api.assignSelf(reportId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/** Staff/Admin assigns a report to a volunteer */
export function useAssignReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      volunteerUid,
    }: {
      reportId: string;
      volunteerUid: string;
    }): Promise<Report> => {
      const response = await api.assignReport(reportId, volunteerUid);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/** Update report status, with optional resolution photo URL */
export function useUpdateReportStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      status,
      resolutionImageUrl,
    }: {
      reportId: string;
      status: string;
      resolutionImageUrl?: string;
    }): Promise<Report> => {
      const response = await api.updateReportStatus(
        reportId,
        status,
        resolutionImageUrl ? { resolutionImageUrl } : undefined
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Invalidation Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function useInvalidateReports() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
    invalidateMyReports: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.myReports() }),
    invalidateMapReports: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.lists() }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.detail(id) }),
  };
}
