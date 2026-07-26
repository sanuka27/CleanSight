import express from 'express';
import {
  getStatusBreakdown,
  getReportsPerDay,
  getTopWasteTypes,
} from '../services/analyticsService.js';
import { rate } from '../utils/metrics.js';
import Report from '../models/Report.js';

const router = express.Router();

/**
 * @openapi
 * /api/public/stats:
 *   get:
 *     summary: Get city-level cleanup statistics (public)
 *     description: |
 *       Returns aggregate waste-report statistics for use on the public landing page.
 *       No authentication required. Data covers all reports since 2020.
 *       Also returns up to 3 recently resolved reports as showcase examples.
 *     tags: [Public]
 *     security: []
 *     responses:
 *       200:
 *         description: Public statistics payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totals:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         resolved: { type: integer }
 *                         inProgress: { type: integer }
 *                         pending: { type: integer }
 *                     resolutionRate: { type: number, example: 72.4 }
 *                     series:
 *                       type: array
 *                       description: Daily report counts
 *                       items: { type: object }
 *                     topWasteTypes:
 *                       type: array
 *                       items: { type: object }
 *                     recentResolved:
 *                       type: array
 *                       maxItems: 3
 *                       items: { $ref: '#/components/schemas/Report' }
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
/* ================================================================== */
/*  GET /api/public/stats                                             */
/*  Public endpoint for city-level cleanup stats                      */
/* ================================================================== */

router.get('/stats', async (req, res) => {
  try {
    const to = new Date();
    const from = new Date('2020-01-01');

    // Global filter (no role restrictions)
    const filter = {};

    const [totals, series, wasteTypes] = await Promise.all([
      getStatusBreakdown(from, to, filter),
      getReportsPerDay(from, to, filter),
      getTopWasteTypes(from, to, filter),
    ]);

    const resolutionRate = rate(totals.resolved, totals.total);

    // Fetch up to 3 recently resolved reports to showcase real impact (before/after proof)
    let recentResolved = await Report.find({
      status: 'resolved',
      isDeleted: false,
      resolutionImageUrl: { $ne: null }
    })
      .sort({ resolvedAt: -1 })
      .limit(3)
      .select('title description imageUrl resolutionImageUrl wasteType resolvedAt')
      .lean();

    if (recentResolved.length < 3) {
      const remainingCount = 3 - recentResolved.length;
      const excludedIds = recentResolved.map(r => r._id);
      const additionalResolved = await Report.find({
        status: 'resolved',
        isDeleted: false,
        _id: { $nin: excludedIds }
      })
        .sort({ resolvedAt: -1 })
        .limit(remainingCount)
        .select('title description imageUrl resolutionImageUrl wasteType resolvedAt')
        .lean();
      recentResolved = [...recentResolved, ...additionalResolved];
    }

    res.json({
      success: true,
      data: {
        totals: {
          total: totals.total,
          resolved: totals.resolved,
          inProgress: totals.in_progress,
          pending: totals.pending,
        },
        resolutionRate,
        series,
        topWasteTypes: wasteTypes,
        recentResolved,
      },
    });
  } catch (error) {
    console.error('Public stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public stats' });
  }
});

export default router;
