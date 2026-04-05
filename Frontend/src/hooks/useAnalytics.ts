// DEPRECATED: Use @/hooks/useAnalyticsQueries.ts instead
// This file uses manual useState/useCallback patterns
// The new hooks use React Query for better caching and state management

export {
  useAnalyticsSummaryQuery,
  useAnalyticsPerformanceQuery,
  useVolunteerAnalyticsQuery,
} from './useAnalyticsQueries';

// For backwards compatibility - composite hook
import { useAnalyticsSummaryQuery, useAnalyticsPerformanceQuery, useVolunteerAnalyticsQuery } from './useAnalyticsQueries';
import type { AnalyticsQueryParams } from "@/types/analytics";

export function useAnalytics(params?: AnalyticsQueryParams) {
  const summaryQuery = useAnalyticsSummaryQuery(params);
  const performanceQuery = useAnalyticsPerformanceQuery(params);
  const volunteersQuery = useVolunteerAnalyticsQuery(params);

  return {
    summary: summaryQuery.data ?? null,
    performance: performanceQuery.data ?? null,
    volunteers: volunteersQuery.data ?? null,
    isLoading: summaryQuery.isLoading || performanceQuery.isLoading,
    error: summaryQuery.error?.message ?? performanceQuery.error?.message ?? null,
    // Legacy method stubs for compatibility (no-op, data is fetched automatically)
    fetchSummary: async () => summaryQuery.data,
    fetchPerformance: async () => performanceQuery.data,
    fetchVolunteers: async () => volunteersQuery.data,
  };
}

export default useAnalytics;
