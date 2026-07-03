/**
 * Dashboard React Query Hooks
 * Replaces manual useState/useCallback fetching with React Query.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type {
  CitizenDashboardData,
  VolunteerDashboardData,
  StaffDashboardData,
  AdminDashboardData,
} from '@/types/dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Citizen Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function useCitizenDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.citizen(),
    queryFn: async (): Promise<CitizenDashboardData> => {
      const res = await api.getCitizenDashboard();
      return res.data;
    },
    refetchOnMount: "always",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Volunteer Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function useVolunteerDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.volunteer(),
    queryFn: async (): Promise<VolunteerDashboardData> => {
      const res = await api.getVolunteerDashboard();
      return res.data;
    },
    refetchOnMount: "always",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function useStaffDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.staff(),
    queryFn: async (): Promise<StaffDashboardData> => {
      const res = await api.getStaffDashboard();
      return res.data;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.admin(),
    queryFn: async (): Promise<AdminDashboardData> => {
      const res = await api.getAdminDashboard();
      return res.data;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Invalidation Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    invalidateCitizen: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.citizen() }),
    invalidateVolunteer: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.volunteer() }),
    invalidateStaff: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.staff() }),
    invalidateAdmin: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.admin() }),
  };
}
