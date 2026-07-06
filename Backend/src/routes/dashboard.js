/**
 * Dashboard Routes
 *
 * Aggregated, role-specific payloads for each dashboard view.
 * All routes require Firebase token authentication (verifyToken).
 *
 * GET /api/dashboard/me         – role-aware redirect hint
 * GET /api/dashboard/citizen    – citizen-specific dashboard data
 * GET /api/dashboard/volunteer  – volunteer-specific dashboard data
 * GET /api/dashboard/staff      – staff/admin triage & ops data
 * GET /api/dashboard/admin      – admin aggregated analytics payload
 */

import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import { requireRole, attachDbUser } from '../middleware/roleGuard.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import Volunteer from '../models/Volunteer.js';
import { ROLES } from '../constants/roles.js';
import { CITIZEN_BADGES } from '../constants/citizenBadges.js';
import { VOLUNTEER_BADGES } from '../constants/volunteerBadges.js';
import { awardCitizenBadges, awardVolunteerBadges } from '../services/badgeService.js';
import {
  getStatusBreakdown,
  getReportsPerDay,
  getResolutionTimes,
  getTopWasteTypes,
  getUrgencyBreakdown,
  getVolunteerStats,
  getTimeToAssign,
} from '../services/analyticsService.js';
import { parseDateRange } from '../utils/dateRange.js';

const router = express.Router();


/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/me — role-aware dashboard hint                 */
/* ------------------------------------------------------------------ */

router.get('/me', verifyToken, attachDbUser, async (req, res) => {
  try {
    const user = req.dbUser;
    res.json({
      success: true,
      data: {
        role: user.role,
        dashboardPath: `/dashboard/${user.role}`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('Dashboard /me error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/citizen                                        */
/* ------------------------------------------------------------------ */

router.get(
  '/citizen',
  verifyToken,
  requireRole(ROLES.CITIZEN, ROLES.ADMIN, ROLES.STAFF),
  async (req, res) => {
    try {
      const { firebaseUid } = req.user;
      const user = req.dbUser;

      // My report totals
      const myFilter = { firebaseUid };
      const [totalResult] = await Report.aggregate([
        { $match: myFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          },
        },
      ]);

      const myTotals = totalResult || { total: 0, pending: 0, assigned: 0, resolved: 0 };

      // Recent reports (last 50 for client-side search/filter)
      // Note: consider adding a compound index on { firebaseUid: 1, createdAt: -1 } for perf
      const recentReports = await Report.find({ firebaseUid, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('_id title status wasteType urgency createdAt updatedAt imageUrl location description')
        .lean();

      const badgeCatalog = CITIZEN_BADGES.map((badge) => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        criteria: badge.criteria || null,
      }));

      let earnedBadges = user?.badges || [];
      let newlyEarnedBadges = [];
      if (user) {
        newlyEarnedBadges = await awardCitizenBadges(user);
        if (newlyEarnedBadges.length > 0) {
          const existingIds = new Set(earnedBadges.map((b) => b.id || b.name).filter(Boolean));
          newlyEarnedBadges.forEach((badge) => {
            const key = badge.id || badge.name;
            if (key && !existingIds.has(key)) {
              earnedBadges.push(badge);
            }
          });
        }
      }

      const citizenProfile = {
        reportsSubmitted: user?.reportsSubmitted ?? myTotals.total,
        badges: earnedBadges,
        badgeCatalog,
      };

      res.json({
        success: true,
        data: {
          myTotals,
          recentReports,
          citizenProfile,
          newlyEarnedBadges,
        },
      });
    } catch (err) {
      console.error('Citizen dashboard error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/volunteer                                      */
/* ------------------------------------------------------------------ */

router.get(
  '/volunteer',
  verifyToken,
  requireRole(ROLES.VOLUNTEER, ROLES.ADMIN, ROLES.STAFF),
  async (req, res) => {
    try {
      const { firebaseUid } = req.user;

      // Tasks assigned to me (active)
      const assignedToMe = await Report.find({
        assignedTo: firebaseUid,
        status: { $in: ['assigned', 'in_progress'] },
      })
        .sort({ createdAt: -1 })
        .limit(30)
        .select('_id title status wasteType urgency createdAt updatedAt imageUrl location description assignedTo')
        .lean();

      // Tasks resolved by me (history)
      const resolvedByMe = await Report.find({
        assignedTo: firebaseUid,
        status: 'resolved',
      })
        .sort({ updatedAt: -1 })
        .limit(30)
        .select('_id title status wasteType urgency createdAt updatedAt imageUrl location description assignedTo')
        .lean();

      // Pending reports (available to pick up)
      const pendingNearby = await Report.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(30)
        .select('_id title status wasteType urgency createdAt updatedAt imageUrl location description assignedTo')
        .lean();

      // My stats (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [myStatsResult] = await Report.aggregate([
        {
          $match: {
            assignedTo: firebaseUid,
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            assignedCount: { $sum: 1 },
            resolvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
            },
          },
        },
      ]);

      const myStats = myStatsResult || { assignedCount: 0, resolvedCount: 0 };

      let volunteerProfile = await Volunteer.findOne({ user: req.dbUser._id })
        .select('stats badges')
        .lean();

      if (!volunteerProfile) {
        const created = await Volunteer.create({
          user: req.dbUser._id,
          isActive: true,
          stats: {
            totalCleanups: req.dbUser.cleanupsCompleted || 0,
            reportsResolved: req.dbUser.cleanupsCompleted || 0,
            hoursVolunteered: 0,
            rating: 5,
          },
        });
        volunteerProfile = created.toObject();
      }

      if (volunteerProfile?.stats) {
        const userCleanups = req.dbUser.cleanupsCompleted || 0;
        const trackedCleanups = volunteerProfile.stats.totalCleanups || 0;
        if (userCleanups > trackedCleanups) {
          volunteerProfile = await Volunteer.findOneAndUpdate(
            { user: req.dbUser._id },
            {
              $set: {
                'stats.totalCleanups': userCleanups,
                'stats.reportsResolved': userCleanups,
              },
            },
            { new: true }
          ).select('stats badges').lean();
        }
      }

      const volunteerStats = volunteerProfile?.stats || {
        totalCleanups: 0,
        hoursVolunteered: 0,
        reportsResolved: 0,
        rating: 5,
      };

      // Issue 4: Badges come from two separate sources of truth.
      // Volunteer badges (cleanup milestones) → Volunteer.badges
      // Citizen badges (report submissions)   → User.badges
      // See services/badgeService.js for the full explanation.
      let volunteerBadges = volunteerProfile?.badges || [];
      let newlyEarnedVolunteerBadges = [];
      if (volunteerProfile) {
        newlyEarnedVolunteerBadges = await awardVolunteerBadges(volunteerProfile);
        if (newlyEarnedVolunteerBadges.length > 0) {
          const existingIds = new Set(volunteerBadges.map((b) => b.id || b.name).filter(Boolean));
          newlyEarnedVolunteerBadges.forEach((badge) => {
            const key = badge.id || badge.name;
            if (key && !existingIds.has(key)) {
              volunteerBadges.push(badge);
            }
          });
        }
      }

      // Citizen badges for this user (may have been awarded via report submissions)
      let citizenBadges = req.dbUser?.badges || [];
      let newlyEarnedCitizenBadges = [];
      if (req.dbUser) {
        newlyEarnedCitizenBadges = await awardCitizenBadges(req.dbUser);
        if (newlyEarnedCitizenBadges.length > 0) {
          const existingIds = new Set(citizenBadges.map((b) => b.id || b.name).filter(Boolean));
          newlyEarnedCitizenBadges.forEach((badge) => {
            const key = badge.id || badge.name;
            if (key && !existingIds.has(key)) {
              citizenBadges.push(badge);
            }
          });
        }
      }

      const volunteerBadgeCatalog = VOLUNTEER_BADGES.map((badge) => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        criteria: badge.criteria || null,
      }));

      res.json({
        success: true,
        data: {
          assignedToMe,
          resolvedByMe,
          pendingNearby,
          myStats: {
            assignedCount: myStats.assignedCount,
            resolvedCount: myStats.resolvedCount,
          },
          volunteerProfile: {
            stats: volunteerStats,
            // volunteerBadges: earned by cleanup activity (source: Volunteer.badges)
            volunteerBadges,
            // citizenBadges: earned by report submissions (source: User.badges)
            citizenBadges,
            volunteerBadgeCatalog,
          },
          // Newly awarded this request (for toast notifications)
          newlyEarnedBadges: [...newlyEarnedVolunteerBadges, ...newlyEarnedCitizenBadges],
        },
      });
    } catch (err) {
      console.error('Volunteer dashboard error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/staff                                          */
/* ------------------------------------------------------------------ */

router.get(
  '/staff',
  verifyToken,
  requireRole(ROLES.STAFF, ROLES.ADMIN),
  async (req, res) => {
    try {
      // Pending reports
      const pendingReports = await Report.find({ status: 'pending', isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('_id status wasteType urgency createdAt imageUrl location description firebaseUid')
        .lean();

      // Assigned reports
      const assignedReports = await Report.find({ status: 'assigned', isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('_id status wasteType urgency createdAt imageUrl location description firebaseUid assignedTo')
        .lean();

      // Resolved today count
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const resolvedTodayCount = await Report.countDocuments({
        status: 'resolved',
        updatedAt: { $gte: todayStart },
      });

      // Top 5 volunteers by resolved count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const topVolunteers = await Report.aggregate([
        {
          $match: {
            assignedTo: { $ne: null },
            status: 'resolved',
            updatedAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: '$assignedTo',
            resolvedCount: { $sum: 1 },
          },
        },
        { $sort: { resolvedCount: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            firebaseUid: '$_id',
            resolvedCount: 1,
          },
        },
      ]);

      // Enrich volunteer data with names
      const volunteerUids = topVolunteers.map((v) => v.firebaseUid);
      const volunteerUsers = await User.find({ firebaseUid: { $in: volunteerUids } })
        .select('firebaseUid name email')
        .lean();

      const volunteerMap = {};
      volunteerUsers.forEach((u) => {
        volunteerMap[u.firebaseUid] = u;
      });

      const volunteerSnapshot = topVolunteers.map((v) => ({
        firebaseUid: v.firebaseUid,
        name: volunteerMap[v.firebaseUid]?.name || 'Unknown',
        email: volunteerMap[v.firebaseUid]?.email || null,
        resolvedCount: v.resolvedCount,
      }));

      // Available volunteers for assignment
      const availableVolunteers = await User.find({ role: ROLES.VOLUNTEER })
        .select('firebaseUid name email')
        .lean();

      res.json({
        success: true,
        data: {
          pendingReports,
          assignedReports,
          resolvedTodayCount,
          volunteerSnapshot,
          availableVolunteers,
        },
      });
    } catch (err) {
      console.error('Staff dashboard error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/admin                                          */
/* ------------------------------------------------------------------ */

router.get(
  '/admin',
  verifyToken,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      // Default to last 7 days
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);

      // Reuse analytics service functions for aggregated payload
      const [
        totals,
        series,
        resolutionTimes,
        topWasteTypes,
        urgencyBreakdown,
        volunteerStats,
        timeToAssign,
      ] = await Promise.all([
        getStatusBreakdown(from, to),
        getReportsPerDay(from, to),
        getResolutionTimes(from, to),
        getTopWasteTypes(from, to),
        getUrgencyBreakdown(from, to),
        getVolunteerStats(from, to),
        getTimeToAssign(from, to),
      ]);

      // Enrich volunteer stats with names
      const volunteerUids = volunteerStats.map((v) => v.assignedTo);
      const volunteerUsers = await User.find({ firebaseUid: { $in: volunteerUids } })
        .select('firebaseUid name email')
        .lean();

      const volunteerMap = {};
      volunteerUsers.forEach((u) => {
        volunteerMap[u.firebaseUid] = u;
      });

      const volunteers = volunteerStats.map((v) => ({
        firebaseUid: v.assignedTo,
        name: volunteerMap[v.assignedTo]?.name || 'Unknown',
        email: volunteerMap[v.assignedTo]?.email || null,
        assignedCount: v.assignedCount,
        resolvedCount: v.resolvedCount,
      }));

      // Recent reports for activity feed
      const recentReports = await Report.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('_id status wasteType urgency createdAt description')
        .lean();

      // Total users count
      const totalUsers = await User.countDocuments();
      const totalVolunteers = await User.countDocuments({ role: ROLES.VOLUNTEER });

      const resolutionRate = totals.total > 0
        ? parseFloat(((totals.resolved / totals.total) * 100).toFixed(1))
        : 0;
      const assignmentRate = totals.total > 0
        ? parseFloat((((totals.assigned + totals.in_progress) / totals.total) * 100).toFixed(1))
        : 0;

      res.json({
        success: true,
        data: {
          range: { from: from.toISOString(), to: to.toISOString() },
          totals,
          rates: { resolutionRate, assignmentRate },
          series,
          topWasteTypes,
          urgencyBreakdown,
          performance: {
            avgResolutionHours: resolutionTimes.avgHours,
            medianResolutionHours: resolutionTimes.medianHours,
            resolvedCount: resolutionTimes.count,
            avgTimeToAssignHours: timeToAssign.avgHours,
            assignedCount: timeToAssign.count,
          },
          volunteers,
          recentReports,
          userCounts: { totalUsers, totalVolunteers },
        },
      });
    } catch (err) {
      console.error('Admin dashboard error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

export default router;
