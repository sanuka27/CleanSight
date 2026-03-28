import Report from '../models/Report.js';

/**
 * ML Analytics Service
 * Provides metrics and insights for Phase 1 (binary validation) and Phase 2 (category classification)
 */

/**
 * Get Phase 1 (Binary Validation) metrics
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Object>} Phase 1 metrics
 */
export const getPhase1Metrics = async (from, to) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;

  const matchStage = Object.keys(dateFilter).length > 0
    ? { createdAt: dateFilter }
    : {};

  // Total predictions and label distribution
  const labelStats = await Report.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$imageValidationLabel',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$imageValidationConfidence' },
      },
    },
  ]);

  // Review status breakdown
  const reviewStatusStats = await Report.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$aiReviewStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  // Final decision breakdown (for reviewed reports)
  const finalDecisionStats = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        finalValidationDecision: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$finalValidationDecision',
        count: { $sum: 1 },
      },
    },
  ]);

  // Confidence distribution (only for reports with confidence)
  const confidenceDistribution = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        imageValidationConfidence: { $ne: null },
      },
    },
    {
      $bucket: {
        groupBy: '$imageValidationConfidence',
        boundaries: [0, 0.5, 0.7, 0.85, 1.0, 1.01],
        default: 'other',
        output: {
          count: { $sum: 1 },
          avgConfidence: { $avg: '$imageValidationConfidence' },
        },
      },
    },
  ]);

  // Override rate calculation
  const totalReviewed = await Report.countDocuments({
    ...matchStage,
    finalValidationDecision: { $ne: null },
  });

  const overrideCount = await Report.countDocuments({
    ...matchStage,
    finalValidationDecision: 'overridden',
  });

  const totalPredictions = await Report.countDocuments(matchStage);

  return {
    totalPredictions,
    labelDistribution: labelStats,
    reviewStatusDistribution: reviewStatusStats,
    finalDecisionDistribution: finalDecisionStats,
    confidenceDistribution,
    totalReviewed,
    overrideCount,
    overrideRate: totalReviewed > 0 ? ((overrideCount / totalReviewed) * 100).toFixed(1) : 0,
  };
};

/**
 * Get Phase 2 (Category Classification) metrics
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Object>} Phase 2 metrics
 */
export const getPhase2Metrics = async (from, to) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;

  const matchStage = Object.keys(dateFilter).length > 0
    ? { createdAt: dateFilter }
    : {};

  // Only count reports where Phase 2 ran (not pending/error)
  const phase2Filter = {
    ...matchStage,
    wasteCategoryPredictedLabel: { $nin: ['pending', 'error'] },
  };

  // Predicted category distribution
  const predictedCategoryStats = await Report.aggregate([
    { $match: phase2Filter },
    {
      $group: {
        _id: '$wasteCategoryPredictedLabel',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$wasteCategoryConfidence' },
      },
    },
  ]);

  // Final category distribution (after review)
  const finalCategoryStats = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        wasteCategoryFinalLabel: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$wasteCategoryFinalLabel',
        count: { $sum: 1 },
      },
    },
  ]);

  // Review status breakdown
  const reviewStatusStats = await Report.aggregate([
    { $match: phase2Filter },
    {
      $group: {
        _id: '$wasteCategoryReviewStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  // Confidence level distribution
  const confidenceLevelStats = await Report.aggregate([
    {
      $match: {
        ...phase2Filter,
        wasteCategoryConfidenceLevel: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$wasteCategoryConfidenceLevel',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$wasteCategoryConfidence' },
      },
    },
  ]);

  // Override analysis: reports where predicted != final
  const overrideAnalysis = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        wasteCategoryFinalLabel: { $ne: null },
        wasteCategoryPredictedLabel: { $nin: ['pending', 'error'] },
      },
    },
    {
      $project: {
        predictedLabel: '$wasteCategoryPredictedLabel',
        finalLabel: '$wasteCategoryFinalLabel',
        wasOverridden: {
          $ne: ['$wasteCategoryPredictedLabel', '$wasteCategoryFinalLabel'],
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        overridden: {
          $sum: { $cond: ['$wasOverridden', 1, 0] },
        },
      },
    },
  ]);

  const totalPhase2 = await Report.countDocuments(phase2Filter);
  const autoAcceptedCount = await Report.countDocuments({
    ...phase2Filter,
    wasteCategoryReviewStatus: 'auto_accepted',
  });

  const overrideData = overrideAnalysis[0] || { total: 0, overridden: 0 };

  return {
    totalPredictions: totalPhase2,
    predictedCategoryDistribution: predictedCategoryStats,
    finalCategoryDistribution: finalCategoryStats,
    reviewStatusDistribution: reviewStatusStats,
    confidenceLevelDistribution: confidenceLevelStats,
    autoAcceptedCount,
    autoAcceptRate: totalPhase2 > 0 ? ((autoAcceptedCount / totalPhase2) * 100).toFixed(1) : 0,
    totalReviewed: overrideData.total,
    overrideCount: overrideData.overridden,
    overrideRate: overrideData.total > 0 ? ((overrideData.overridden / overrideData.total) * 100).toFixed(1) : 0,
  };
};

/**
 * Get ML analytics summary (combined Phase 1 & Phase 2 overview)
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Object>} Combined ML metrics summary
 */
export const getMLSummary = async (from, to) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;

  const matchStage = Object.keys(dateFilter).length > 0
    ? { createdAt: dateFilter }
    : {};

  const totalReports = await Report.countDocuments(matchStage);

  // Phase 1 summary
  const phase1Approved = await Report.countDocuments({
    ...matchStage,
    aiReviewStatus: { $in: ['approved', 'overridden'] },
  });

  const phase1NeedsReview = await Report.countDocuments({
    ...matchStage,
    aiReviewStatus: { $in: ['flagged', 'manual_review'] },
  });

  const phase1AvgConfidence = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        imageValidationConfidence: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        avgConfidence: { $avg: '$imageValidationConfidence' },
      },
    },
  ]);

  // Phase 2 summary
  const phase2Active = await Report.countDocuments({
    ...matchStage,
    wasteCategoryPredictedLabel: { $nin: ['pending', 'error'] },
  });

  const phase2AutoAccepted = await Report.countDocuments({
    ...matchStage,
    wasteCategoryReviewStatus: 'auto_accepted',
  });

  const phase2NeedsReview = await Report.countDocuments({
    ...matchStage,
    wasteCategoryReviewStatus: { $in: ['flagged', 'manual_review'] },
  });

  const phase2AvgConfidence = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        wasteCategoryConfidence: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        avgConfidence: { $avg: '$wasteCategoryConfidence' },
      },
    },
  ]);

  return {
    totalReports,
    phase1: {
      approved: phase1Approved,
      needsReview: phase1NeedsReview,
      avgConfidence: phase1AvgConfidence[0]?.avgConfidence || null,
      approvalRate: totalReports > 0 ? ((phase1Approved / totalReports) * 100).toFixed(1) : 0,
    },
    phase2: {
      totalActive: phase2Active,
      autoAccepted: phase2AutoAccepted,
      needsReview: phase2NeedsReview,
      avgConfidence: phase2AvgConfidence[0]?.avgConfidence || null,
      autoAcceptRate: phase2Active > 0 ? ((phase2AutoAccepted / phase2Active) * 100).toFixed(1) : 0,
    },
    reviewQueueSize: phase1NeedsReview + phase2NeedsReview,
  };
};

/**
 * Get ML trends over time (daily aggregation)
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Array>} Daily trend data points
 */
export const getMLTrends = async (from, to) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;

  const matchStage = Object.keys(dateFilter).length > 0
    ? { createdAt: dateFilter }
    : {};

  const trends = await Report.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        totalPredictions: { $sum: 1 },
        phase1Approved: {
          $sum: {
            $cond: [
              { $in: ['$aiReviewStatus', ['approved', 'overridden']] },
              1,
              0,
            ],
          },
        },
        phase1Flagged: {
          $sum: {
            $cond: [
              { $in: ['$aiReviewStatus', ['flagged', 'manual_review']] },
              1,
              0,
            ],
          },
        },
        phase2AutoAccepted: {
          $sum: {
            $cond: [
              { $eq: ['$wasteCategoryReviewStatus', 'auto_accepted'] },
              1,
              0,
            ],
          },
        },
        phase2NeedsReview: {
          $sum: {
            $cond: [
              { $in: ['$wasteCategoryReviewStatus', ['flagged', 'manual_review']] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trends.map((t) => ({
    date: t._id,
    totalPredictions: t.totalPredictions,
    phase1Approved: t.phase1Approved,
    phase1Flagged: t.phase1Flagged,
    phase2AutoAccepted: t.phase2AutoAccepted,
    phase2NeedsReview: t.phase2NeedsReview,
  }));
};

/**
 * Get weak points analysis (categories with issues)
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Array>} Weak point insights by category
 */
export const getWeakPoints = async (from, to) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;

  const matchStage = Object.keys(dateFilter).length > 0
    ? { createdAt: dateFilter }
    : {};

  // Analyze each category: override rate, avg confidence, review frequency
  const categoryAnalysis = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        wasteCategoryPredictedLabel: { $nin: ['pending', 'error'] },
      },
    },
    {
      $group: {
        _id: '$wasteCategoryPredictedLabel',
        totalPredictions: { $sum: 1 },
        avgConfidence: { $avg: '$wasteCategoryConfidence' },
        lowConfidenceCount: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$wasteCategoryConfidenceLevel', 'LOW'] },
                  { $eq: ['$wasteCategoryConfidenceLevel', 'VERY LOW'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        manualReviewCount: {
          $sum: {
            $cond: [
              { $in: ['$wasteCategoryReviewStatus', ['flagged', 'manual_review']] },
              1,
              0,
            ],
          },
        },
        overriddenCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$wasteCategoryFinalLabel', null] },
                  { $ne: ['$wasteCategoryPredictedLabel', '$wasteCategoryFinalLabel'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        category: '$_id',
        totalPredictions: 1,
        avgConfidence: { $round: ['$avgConfidence', 3] },
        lowConfidenceCount: 1,
        manualReviewCount: 1,
        overriddenCount: 1,
        overrideRate: {
          $cond: [
            { $gt: ['$totalPredictions', 0] },
            {
              $round: [
                { $multiply: [{ $divide: ['$overriddenCount', '$totalPredictions'] }, 100] },
                1,
              ],
            },
            0,
          ],
        },
        manualReviewRate: {
          $cond: [
            { $gt: ['$totalPredictions', 0] },
            {
              $round: [
                { $multiply: [{ $divide: ['$manualReviewCount', '$totalPredictions'] }, 100] },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { overrideRate: -1 } },
  ]);

  return categoryAnalysis.map((cat) => ({
    category: cat.category,
    totalPredictions: cat.totalPredictions,
    avgConfidence: cat.avgConfidence,
    lowConfidenceCount: cat.lowConfidenceCount,
    manualReviewCount: cat.manualReviewCount,
    overriddenCount: cat.overriddenCount,
    overrideRate: cat.overrideRate,
    manualReviewRate: cat.manualReviewRate,
  }));
};

/**
 * Get confidence distribution for both phases
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Object>} Confidence distribution data
 */
export const getConfidenceDistribution = async (from, to) => {
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;

  const matchStage = Object.keys(dateFilter).length > 0
    ? { createdAt: dateFilter }
    : {};

  // Phase 1 confidence buckets
  const phase1Distribution = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        imageValidationConfidence: { $ne: null },
      },
    },
    {
      $bucket: {
        groupBy: '$imageValidationConfidence',
        boundaries: [0, 0.5, 0.7, 0.85, 1.0, 1.01],
        default: 'other',
        output: {
          count: { $sum: 1 },
        },
      },
    },
  ]);

  // Phase 2 confidence level counts
  const phase2Distribution = await Report.aggregate([
    {
      $match: {
        ...matchStage,
        wasteCategoryConfidenceLevel: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$wasteCategoryConfidenceLevel',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    phase1: phase1Distribution.map((bucket) => ({
      range: `${bucket._id * 100}-${bucket._id === 1 ? 100 : (bucket._id + 0.15) * 100}%`,
      rangeMin: bucket._id,
      count: bucket.count,
    })),
    phase2: phase2Distribution.map((item) => ({
      level: item._id,
      count: item.count,
    })),
  };
};
