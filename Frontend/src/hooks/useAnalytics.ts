import { useState, useCallback } from "react";
import api from "@/lib/api";
import type {
  AnalyticsQueryParams,
  SummaryResponse,
  PerformanceResponse,
  VolunteerAnalyticsResponse,
} from "@/types/analytics";

interface AnalyticsState {
  summary: SummaryResponse["data"] | null;
  performance: PerformanceResponse["data"] | null;
  volunteers: VolunteerAnalyticsResponse["data"] | null;
  isLoading: boolean;
  error: string | null;
}

export function useAnalytics() {
  const [state, setState] = useState<AnalyticsState>({
    summary: null,
    performance: null,
    volunteers: null,
    isLoading: false,
    error: null,
  });

  /* ----- Summary ----- */

  const fetchSummary = useCallback(async (params?: AnalyticsQueryParams) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await api.getAnalyticsSummary(params);
      setState((s) => ({ ...s, summary: res.data, isLoading: false }));
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch analytics summary";
      setState((s) => ({ ...s, isLoading: false, error: message }));
      return null;
    }
  }, []);

  /* ----- Performance ----- */

  const fetchPerformance = useCallback(async (params?: AnalyticsQueryParams) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await api.getAnalyticsPerformance(params);
      setState((s) => ({ ...s, performance: res.data, isLoading: false }));
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch performance data";
      setState((s) => ({ ...s, isLoading: false, error: message }));
      return null;
    }
  }, []);

  /* ----- Volunteers (staff/admin only) ----- */

  const fetchVolunteers = useCallback(async (params?: AnalyticsQueryParams) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await api.getVolunteerAnalytics(params);
      setState((s) => ({ ...s, volunteers: res.data, isLoading: false }));
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch volunteer analytics";
      setState((s) => ({ ...s, isLoading: false, error: message }));
      return null;
    }
  }, []);

  return {
    ...state,
    fetchSummary,
    fetchPerformance,
    fetchVolunteers,
  };
}

export default useAnalytics;
