/**
 * ML Analytics Types
 * Type definitions for ML Phase 1 and Phase 2 analytics
 */

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

// Phase 1 (Binary Validation) Types

export interface Phase1LabelStat {
  _id: string; // 'trash' | 'non-trash' | 'error' | 'pending'
  count: number;
  avgConfidence: number | null;
}

export interface Phase1ConfidenceBucket {
  _id: number | 'other'; // boundary value or 'other' default bucket
  count: number;
  avgConfidence: number;
}

export interface Phase1ReviewStatusStat {
  _id: string; // 'approved' | 'flagged' | 'manual_review' | 'pending' | 'rejected' | 'overridden'
  count: number;
}

export interface Phase1FinalDecisionStat {
  _id: string; // 'approved' | 'rejected' | 'overridden'
  count: number;
}

export interface Phase1ConfidenceBucket {
  _id: number | 'other'; // boundary value or 'other' default bucket
  count: number;
  avgConfidence: number;
}

export interface Phase1Metrics {
  totalPredictions: number;
  labelDistribution: Phase1LabelStat[];
  reviewStatusDistribution: Phase1ReviewStatusStat[];
  finalDecisionDistribution: Phase1FinalDecisionStat[];
  confidenceDistribution: Phase1ConfidenceBucket[];
  totalReviewed: number;
  overrideCount: number;
  overrideRate: string; // percentage as string
}

// Phase 2 (Category Classification) Types

export interface Phase2CategoryStat {
  _id: string; // 'glass' | 'mixed' | 'paper' | 'plastic'
  count: number;
  avgConfidence: number | null;
}

export interface Phase2ReviewStatusStat {
  _id: string; // 'auto_accepted' | 'flagged' | 'manual_review' | 'pending' | 'approved' | 'overridden' | 'rejected'
  count: number;
}

export interface Phase2ConfidenceLevelStat {
  _id: string; // 'HIGH' | 'MODERATE' | 'LOW' | 'VERY LOW'
  count: number;
  avgConfidence: number;
}

export interface Phase2Metrics {
  totalPredictions: number;
  predictedCategoryDistribution: Phase2CategoryStat[];
  finalCategoryDistribution: Phase2CategoryStat[];
  reviewStatusDistribution: Phase2ReviewStatusStat[];
  confidenceLevelDistribution: Phase2ConfidenceLevelStat[];
  autoAcceptedCount: number;
  autoAcceptRate: string;
  totalReviewed: number;
  overrideCount: number;
  overrideRate: string;
}

// ML Summary Types

export interface Phase1Summary {
  approved: number;
  needsReview: number;
  avgConfidence: number | null;
  approvalRate: string;
}

export interface Phase2Summary {
  totalActive: number;
  autoAccepted: number;
  needsReview: number;
  avgConfidence: number | null;
  autoAcceptRate: string;
}

export interface MLSummary {
  totalReports: number;
  phase1: Phase1Summary;
  phase2: Phase2Summary;
  reviewQueueSize: number;
}

// Trends Types

export interface MLTrendPoint {
  date: string; // YYYY-MM-DD
  totalPredictions: number;
  phase1Approved: number;
  phase1Flagged: number;
  phase2AutoAccepted: number;
  phase2NeedsReview: number;
}

// Weak Points Analysis Types

export interface WeakPointData {
  category: string;
  totalPredictions: number;
  avgConfidence: number;
  lowConfidenceCount: number;
  manualReviewCount: number;
  overriddenCount: number;
  overrideRate: number;
  manualReviewRate: number;
}

// Confidence Distribution Types

export interface Phase1ConfidenceRange {
  range: string; // e.g., "0-50%"
  rangeMin: number;
  count: number;
}

export interface Phase2ConfidenceLevel {
  level: string; // 'HIGH' | 'MODERATE' | 'LOW' | 'VERY LOW'
  count: number;
}

export interface ConfidenceDistribution {
  phase1: Phase1ConfidenceRange[];
  phase2: Phase2ConfidenceLevel[];
}

// API Response Types

export interface MLAnalyticsResponse<T> {
  success: boolean;
  data: T & {
    range?: {
      from: string | null;
      to: string | null;
    };
  };
  message?: string;
}

export interface MLSummaryResponse extends MLAnalyticsResponse<MLSummary> {}
export interface Phase1MetricsResponse extends MLAnalyticsResponse<Phase1Metrics> {}
export interface Phase2MetricsResponse extends MLAnalyticsResponse<Phase2Metrics> {}

export interface MLTrendsResponse extends MLAnalyticsResponse<{
  trends: MLTrendPoint[];
}> {}

export interface WeakPointsResponse extends MLAnalyticsResponse<{
  categories: WeakPointData[];
}> {}

export interface ConfidenceDistributionResponse extends MLAnalyticsResponse<ConfidenceDistribution> {}

// Filters

export interface MLAnalyticsFilters {
  preset?: string; // '7d' | '30d' | '90d' | 'custom'
  from?: string; // ISO date string
  to?: string; // ISO date string
}
