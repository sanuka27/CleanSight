/**
 * ML Analytics Service
 * Frontend API service for ML analytics endpoints
 */

import { auth } from "@/lib/firebase";
import type {
  MLSummaryResponse,
  Phase1MetricsResponse,
  Phase2MetricsResponse,
  MLTrendsResponse,
  WeakPointsResponse,
  ConfidenceDistributionResponse,
  MLAnalyticsFilters,
} from "@/types/mlAnalytics";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function mlFetch<T>(path: string, filters: MLAnalyticsFilters = {}): Promise<T> {
  const token = await getToken();
  const params = new URLSearchParams();
  
  if (filters.preset && filters.preset !== 'custom') {
    params.set('preset', filters.preset);
  }
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }

  const queryString = params.toString();
  const url = `${API_BASE}/api/ml-analytics${path}${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `ML Analytics API error ${res.status}`);
  }

  return res.json();
}

/**
 * Get ML analytics summary (overview of both phases)
 */
export async function getMLSummary(
  preset?: string,
  from?: string,
  to?: string
): Promise<MLSummaryResponse> {
  return mlFetch<MLSummaryResponse>('/summary', { preset, from, to });
}

/**
 * Get Phase 1 (binary validation) metrics
 */
export async function getPhase1Metrics(
  preset?: string,
  from?: string,
  to?: string
): Promise<Phase1MetricsResponse> {
  return mlFetch<Phase1MetricsResponse>('/phase1', { preset, from, to });
}

/**
 * Get Phase 2 (category classification) metrics
 */
export async function getPhase2Metrics(
  preset?: string,
  from?: string,
  to?: string
): Promise<Phase2MetricsResponse> {
  return mlFetch<Phase2MetricsResponse>('/phase2', { preset, from, to });
}

/**
 * Get ML trends over time
 */
export async function getMLTrends(
  preset?: string,
  from?: string,
  to?: string
): Promise<MLTrendsResponse> {
  return mlFetch<MLTrendsResponse>('/trends', { preset, from, to });
}

/**
 * Get weak points analysis (categories with issues)
 */
export async function getWeakPoints(
  preset?: string,
  from?: string,
  to?: string
): Promise<WeakPointsResponse> {
  return mlFetch<WeakPointsResponse>('/weak-points', { preset, from, to });
}

/**
 * Get confidence distribution for both phases
 */
export async function getConfidenceDistribution(
  preset?: string,
  from?: string,
  to?: string
): Promise<ConfidenceDistributionResponse> {
  return mlFetch<ConfidenceDistributionResponse>('/confidence-distribution', { preset, from, to });
}
