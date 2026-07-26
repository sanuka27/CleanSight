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
 * @openapi
 * /api/ml-analytics/summary:
 *   get:
 *     summary: ML analytics overall summary
 *     description: |
 *       Returns combined Phase 1 (image validation) and Phase 2 (waste category
 *       classification) ML analytics for the given date range.
 *       Authentication required.
 *     tags: [ML Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *     responses:
 *       200:
 *         description: ML summary payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * /api/ml-analytics/phase1:
 *   get:
 *     summary: Phase 1 ML metrics (binary image validation)
 *     description: Metrics for the Phase 1 binary waste-image validation model (valid vs. invalid).
 *     tags: [ML Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *     responses:
 *       200:
 *         description: Phase 1 metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * /api/ml-analytics/phase2:
 *   get:
 *     summary: Phase 2 ML metrics (category classification)
 *     description: Metrics for the Phase 2 multi-class waste category classification model.
 *     tags: [ML Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *     responses:
 *       200:
 *         description: Phase 2 metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * /api/ml-analytics/trends:
 *   get:
 *     summary: ML prediction time-series trends
 *     description: Daily time-series data of ML predictions and human review overrides.
 *     tags: [ML Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *     responses:
 *       200:
 *         description: ML trend data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * /api/ml-analytics/weak-points:
 *   get:
 *     summary: ML weak-point analysis
 *     description: Categories with high override rates or low prediction confidence — useful for targeted model retraining.
 *     tags: [ML Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *     responses:
 *       200:
 *         description: Weak-point categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 * /api/ml-analytics/confidence-distribution:
 *   get:
 *     summary: ML confidence score distribution
 *     description: Histogram of confidence scores for Phase 1 and Phase 2 predictions across the date range.
 *     tags: [ML Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *     responses:
 *       200:
 *         description: Confidence distribution data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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
