/**
 * React Query hooks for analytics data
 * Replaces manual useState/useCallback pattern in useAnalytics.ts
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { AnalyticsQueryParams } from "@/types/analytics";

/**
 * Fetch analytics summary with React Query
 */
export function useAnalyticsSummaryQuery(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: queryKeys.analytics.summary(params),
    queryFn: async () => {
      const res = await api.getAnalyticsSummary(params);
      return res.data;
    },
  });
}

/**
 * Fetch analytics performance with React Query
 */
export function useAnalyticsPerformanceQuery(params?: AnalyticsQueryParams) {
  return useQuery({
    queryKey: queryKeys.analytics.performance(params),
    queryFn: async () => {
      const res = await api.getAnalyticsPerformance(params);
      return res.data;
    },
  });
}

/**
 * Fetch volunteer analytics (staff/admin only) with React Query
 */
export function useVolunteerAnalyticsQuery(
  params?: AnalyticsQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.analytics.volunteers(params),
    queryFn: async () => {
      const res = await api.getVolunteerAnalytics(params);
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
}
