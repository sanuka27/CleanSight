/**
 * ML Analytics Routes
 * Provides analytics endpoints for Phase 1 (binary validation) and Phase 2 (category classification)
 */

import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import validateAnalyticsQuery from '../middleware/validateAnalyticsQuery.js';
import { parseDateRange } from '../utils/dateRange.js';
import {
  getMLSummary,
  getPhase1Metrics,
  getPhase2Metrics,
  getMLTrends,
  getWeakPoints,
  getConfidenceDistribution,
} from '../services/mlAnalyticsService.js';

const router = express.Router();

/**
 * GET /api/ml-analytics/summary
 * Overall ML analytics summary for both phases
 */
router.get('/summary', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { from, to } = parseDateRange(req.query);
    const summary = await getMLSummary(from, to);

    res.json({
      success: true,
      data: {
        range: { from, to },
        ...summary,
      },
    });
  } catch (error) {
    console.error('ML Analytics summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch ML analytics summary',
    });
  }
});

/**
 * GET /api/ml-analytics/phase1
 * Phase 1 (binary validation) specific metrics
 */
router.get('/phase1', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { from, to } = parseDateRange(req.query);
    const metrics = await getPhase1Metrics(from, to);

    res.json({
      success: true,
      data: {
        range: { from, to },
        ...metrics,
      },
    });
  } catch (error) {
    console.error('ML Analytics Phase 1 error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Phase 1 metrics',
    });
  }
});

/**
 * GET /api/ml-analytics/phase2
 * Phase 2 (category classification) specific metrics
 */
router.get('/phase2', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { from, to } = parseDateRange(req.query);
    const metrics = await getPhase2Metrics(from, to);

    res.json({
      success: true,
      data: {
        range: { from, to },
        ...metrics,
      },
    });
  } catch (error) {
    console.error('ML Analytics Phase 2 error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Phase 2 metrics',
    });
  }
});

/**
 * GET /api/ml-analytics/trends
 * Time-series trends for ML predictions and reviews
 */
router.get('/trends', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { from, to } = parseDateRange(req.query);
    const trends = await getMLTrends(from, to);

    res.json({
      success: true,
      data: {
        range: { from, to },
        trends,
      },
    });
  } catch (error) {
    console.error('ML Analytics trends error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch ML trends',
    });
  }
});

/**
 * GET /api/ml-analytics/weak-points
 * Categories with high override rates or low confidence
 */
router.get('/weak-points', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { from, to } = parseDateRange(req.query);
    const weakPoints = await getWeakPoints(from, to);

    res.json({
      success: true,
      data: {
        range: { from, to },
        categories: weakPoints,
      },
    });
  } catch (error) {
    console.error('ML Analytics weak points error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch weak points analysis',
    });
  }
});

/**
 * GET /api/ml-analytics/confidence-distribution
 * Confidence distribution for both Phase 1 and Phase 2
 */
router.get('/confidence-distribution', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { from, to } = parseDateRange(req.query);
    const distribution = await getConfidenceDistribution(from, to);

    res.json({
      success: true,
      data: {
        range: { from, to },
        ...distribution,
      },
    });
  } catch (error) {
    console.error('ML Analytics confidence distribution error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch confidence distribution',
    });
  }
});

export default router;
