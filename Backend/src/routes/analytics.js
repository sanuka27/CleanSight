/**
 * Analytics Routes
 *
 * GET /api/analytics/summary       – totals, status breakdown, series, waste types, urgency
 * GET /api/analytics/performance   – resolution time, time-to-assign
 * GET /api/analytics/volunteers    – per-volunteer stats (staff/admin only)
 *
 * All routes require authentication (verifyToken) and validated query params.
 * Role-based filtering is applied automatically:
 *   - citizen:   own reports only (filtered by firebaseUid)
 *   - volunteer: global metrics + "my assigned" section
 *   - staff/admin: full global metrics + volunteer list
 */

import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import validateAnalyticsQuery from '../middleware/validateAnalyticsQuery.js';
import { parseDateRange } from '../utils/dateRange.js';
import { safeDivide, rate } from '../utils/metrics.js';
import { ROLES, ANALYTICS_GLOBAL_ROLES, ANALYTICS_VOLUNTEER_ROLES } from '../constants/roles.js';
import User from '../models/User.js';
import {
  getStatusBreakdown,
  getReportsPerDay,
  getResolutionTimes,
  getTopWasteTypes,
  getUrgencyBreakdown,
  getVolunteerStats,
  getTimeToAssign,
} from '../services/analyticsService.js';

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  Helper: resolve role + build filter for current user               */
/* ------------------------------------------------------------------ */

async function resolveUserContext(firebaseUid) {
  const user = await User.findOne({ firebaseUid });
  if (!user) return { role: ROLES.CITIZEN, filter: { firebaseUid } };

  const role = user.role || ROLES.CITIZEN;

  // Citizens only see their own data
  if (role === ROLES.CITIZEN) {
    return { role, filter: { firebaseUid }, user };
  }

  // Volunteers, staff, admin see global data
  return { role, filter: {}, user };
}

/* ================================================================== */
/*  GET /api/analytics/summary                                        */
/* ================================================================== */

router.get('/summary', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { firebaseUid } = req.user;
    const { role, filter } = await resolveUserContext(firebaseUid);
    const { from, to } = parseDateRange(req.query);

    // Core metrics
    const [totals, series, wasteTypes, urgency] = await Promise.all([
      getStatusBreakdown(from, to, filter),
      getReportsPerDay(from, to, filter),
      getTopWasteTypes(from, to, filter),
      getUrgencyBreakdown(from, to, filter),
    ]);

    const resolutionRate = rate(totals.resolved, totals.total);
    const assignmentRate = rate(totals.assigned + totals.resolved, totals.total);

    const payload = {
      range: { from, to },
      totals: {
        total: totals.total,
        pending: totals.pending,
        assigned: totals.assigned,
        resolved: totals.resolved,
      },
      rates: { resolutionRate, assignmentRate },
      series,
      topWasteTypes: wasteTypes,
      urgencyBreakdown: urgency,
    };

    // Volunteer: also include "my assigned" counts
    if (role === ROLES.VOLUNTEER) {
      const myFilter = { assignedTo: firebaseUid };
      const myTotals = await getStatusBreakdown(from, to, myFilter);
      payload.myAssigned = {
        total: myTotals.total,
        resolved: myTotals.resolved,
        pending: myTotals.assigned, // still assigned = not yet resolved
      };
    }

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================================================================== */
/*  GET /api/analytics/performance                                    */
/* ================================================================== */

router.get('/performance', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { firebaseUid } = req.user;
    const { filter } = await resolveUserContext(firebaseUid);
    const { from, to } = parseDateRange(req.query);

    const [resolution, assignment] = await Promise.all([
      getResolutionTimes(from, to, filter),
      getTimeToAssign(from, to, filter),
    ]);

    res.json({
      success: true,
      data: {
        range: { from, to },
        avgResolutionHours: resolution.avgHours,
        medianResolutionHours: resolution.medianHours,
        resolvedCount: resolution.count,
        avgTimeToAssignHours: assignment.avgHours,
        assignedCount: assignment.count,
        _note: resolution.avgHours === null
          ? 'No resolved reports in range; timestamps may be unavailable.'
          : undefined,
      },
    });
  } catch (error) {
    console.error('Analytics performance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================================================================== */
/*  GET /api/analytics/volunteers  (staff / admin only)               */
/* ================================================================== */

router.get('/volunteers', verifyToken, validateAnalyticsQuery, async (req, res) => {
  try {
    const { firebaseUid } = req.user;
    const { role } = await resolveUserContext(firebaseUid);

    if (!ANALYTICS_VOLUNTEER_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only staff or admin can view volunteer analytics.',
      });
    }

    const { from, to } = parseDateRange(req.query);
    const stats = await getVolunteerStats(from, to);

    // Enrich with user info
    const enriched = await Promise.all(
      stats.map(async (s) => {
        const user = await User.findOne({ firebaseUid: s.assignedTo }).select(
          'firebaseUid name email'
        );
        return {
          firebaseUid: s.assignedTo,
          name: user?.name || 'Unknown',
          email: user?.email || null,
          assignedCount: s.assignedCount,
          resolvedCount: s.resolvedCount,
        };
      })
    );

    res.json({
      success: true,
      data: {
        range: { from, to },
        volunteers: enriched,
      },
    });
  } catch (error) {
    console.error('Analytics volunteers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
