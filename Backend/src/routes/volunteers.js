/**
 * Volunteer Routes
 * 
 * Handles volunteer profile management, task claiming, and leaderboard.
 * Uses Firebase authentication via verifyToken middleware.
 */

import express from 'express';
import mongoose from 'mongoose';
import Volunteer from '../models/Volunteer.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { ROLES } from '../constants/roles.js';
import { REPORT_STATUS } from '../constants/reportStatus.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  Helper: require specific role(s) — always verify from DB          */
/* ------------------------------------------------------------------ */

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const { firebaseUid } = req.user;
      const user = await User.findOne({ firebaseUid });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found. Please complete registration.'
        });
      }
      
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Role '${user.role}' is not authorized to access this route`
        });
      }
      
      // Attach full user object for convenience
      req.dbUser = user;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
}

/* ------------------------------------------------------------------ */
/*  GET /api/volunteers                                               */
/*  Get all volunteer profiles (public)                               */
/* ------------------------------------------------------------------ */

router.get('/', asyncHandler(async (req, res) => {
  const { isActive, availability, limit = 20, page = 1 } = req.query;

  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (availability) query.availability = String(availability).trim();

  const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [volunteers, total] = await Promise.all([
    Volunteer.find(query)
      .populate('user', 'name email avatar')
      .sort({ 'stats.totalCleanups': -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Volunteer.countDocuments(query)
  ]);

  res.json({
    success: true,
    count: volunteers.length,
    total,
    pagination: {
      page: Math.max(1, Number(page)),
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    },
    data: volunteers
  });
}));

/* ------------------------------------------------------------------ */
/*  POST /api/volunteers/register                                     */
/*  Register as a volunteer (upgrades citizen to volunteer role)      */
/* ------------------------------------------------------------------ */

router.post('/register', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;
  const { bio, skills, availability, preferredAreas } = req.body;

  // Find the user
  const user = await User.findOne({ firebaseUid });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User profile not found. Please complete registration first.'
    });
  }

  // Check if user is already a volunteer or higher role
  if ([ROLES.VOLUNTEER, ROLES.STAFF, ROLES.ADMIN].includes(user.role)) {
    // Check if volunteer profile exists
    const existingVolunteer = await Volunteer.findOne({ user: user._id });
    if (existingVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as a volunteer'
      });
    }
  }

  // Validate skills if provided
  const validSkills = ['waste-sorting', 'heavy-lifting', 'driving', 'coordination', 'community-outreach'];
  if (skills && Array.isArray(skills)) {
    const invalidSkills = skills.filter(s => !validSkills.includes(s));
    if (invalidSkills.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid skills: ${invalidSkills.join(', ')}. Valid options: ${validSkills.join(', ')}`
      });
    }
  }

  // Validate availability if provided
  const validAvailability = ['weekdays', 'weekends', 'flexible', 'evenings'];
  if (availability && !validAvailability.includes(availability)) {
    return res.status(400).json({
      success: false,
      message: `Invalid availability. Must be one of: ${validAvailability.join(', ')}`
    });
  }

  // Create volunteer profile
  const volunteer = await Volunteer.create({
    user: user._id,
    bio: bio ? String(bio).slice(0, 300) : undefined,
    skills: skills || [],
    availability: availability || 'flexible',
    preferredAreas: preferredAreas || []
  });

  // Update user role to volunteer (if currently citizen)
  if (user.role === ROLES.CITIZEN) {
    user.role = ROLES.VOLUNTEER;
    await user.save();
  }

  // Populate user info for response
  const populatedVolunteer = await Volunteer.findById(volunteer._id)
    .populate('user', 'name email avatar')
    .lean();

  res.status(201).json({
    success: true,
    message: 'Successfully registered as a volunteer',
    data: populatedVolunteer
  });
}));

/* ------------------------------------------------------------------ */
/*  GET /api/volunteers/me                                            */
/*  Get current volunteer profile                                     */
/* ------------------------------------------------------------------ */

router.get('/me', verifyToken, requireRole(ROLES.VOLUNTEER, ROLES.STAFF, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findOne({ user: req.dbUser._id })
    .populate('user', 'name email avatar')
    .populate('currentTasks')
    .lean();

  if (!volunteer) {
    return res.status(404).json({
      success: false,
      message: 'Volunteer profile not found. Please register as a volunteer first.'
    });
  }

  res.json({
    success: true,
    data: volunteer
  });
}));

/* ------------------------------------------------------------------ */
/*  PUT /api/volunteers/me                                            */
/*  Update volunteer profile                                          */
/* ------------------------------------------------------------------ */

router.put('/me', verifyToken, requireRole(ROLES.VOLUNTEER, ROLES.STAFF, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { bio, skills, availability, preferredAreas, isActive } = req.body;

  // Validate skills if provided
  const validSkills = ['waste-sorting', 'heavy-lifting', 'driving', 'coordination', 'community-outreach'];
  if (skills && Array.isArray(skills)) {
    const invalidSkills = skills.filter(s => !validSkills.includes(s));
    if (invalidSkills.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid skills: ${invalidSkills.join(', ')}`
      });
    }
  }

  // Validate availability if provided
  const validAvailability = ['weekdays', 'weekends', 'flexible', 'evenings'];
  if (availability && !validAvailability.includes(availability)) {
    return res.status(400).json({
      success: false,
      message: `Invalid availability. Must be one of: ${validAvailability.join(', ')}`
    });
  }

  const updateData = {};
  if (bio !== undefined) updateData.bio = String(bio).slice(0, 300);
  if (skills !== undefined) updateData.skills = skills;
  if (availability !== undefined) updateData.availability = availability;
  if (preferredAreas !== undefined) updateData.preferredAreas = preferredAreas;
  if (typeof isActive === 'boolean') updateData.isActive = isActive;

  const volunteer = await Volunteer.findOneAndUpdate(
    { user: req.dbUser._id },
    updateData,
    { new: true, runValidators: true }
  ).populate('user', 'name email avatar').lean();

  if (!volunteer) {
    return res.status(404).json({
      success: false,
      message: 'Volunteer profile not found'
    });
  }

  res.json({
    success: true,
    data: volunteer
  });
}));

/* ------------------------------------------------------------------ */
/*  POST /api/volunteers/claim/:reportId                              */
/*  Claim a report for cleanup (volunteer self-assignment)            */
/* ------------------------------------------------------------------ */

router.post('/claim/:reportId', verifyToken, requireRole(ROLES.VOLUNTEER, ROLES.STAFF, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { firebaseUid } = req.user;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid report ID'
    });
  }

  const report = await Report.findById(reportId);

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }

  // Check if report is already assigned
  if (report.assignedTo) {
    return res.status(400).json({
      success: false,
      message: 'Report is already assigned to a volunteer'
    });
  }

  // Check if report is in a claimable status (pending or verified are both pre-assignment states)
  const claimableStatuses = [REPORT_STATUS.PENDING, REPORT_STATUS.VERIFIED];
  if (!claimableStatuses.includes(report.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot claim a report with status '${report.status}'`
    });
  }

  // Assign report to volunteer (using firebaseUid for consistency)
  report.assignedTo = firebaseUid;
  report.status = 'assigned';
  await report.save();

  // Add to volunteer's current tasks
  await Volunteer.findOneAndUpdate(
    { user: req.dbUser._id },
    { $addToSet: { currentTasks: report._id } }
  );

  res.json({
    success: true,
    message: 'Report claimed successfully',
    data: report
  });
}));

/* ------------------------------------------------------------------ */
/*  GET /api/volunteers/leaderboard                                   */
/*  Get top volunteers leaderboard (public)                           */
/* ------------------------------------------------------------------ */

router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(50, Math.max(1, Number(limit)));

  const volunteers = await Volunteer.find({ isActive: true })
    .populate('user', 'name avatar')
    .sort({ 'stats.totalCleanups': -1, 'stats.reportsResolved': -1 })
    .limit(limitNum)
    .lean();

  res.json({
    success: true,
    count: volunteers.length,
    data: volunteers
  });
}));

/* ------------------------------------------------------------------ */
/*  GET /api/volunteers/:uid/stats                                    */
/*  Get volunteer stats by firebase UID (public summary)              */
/* ------------------------------------------------------------------ */

router.get('/:uid/stats', asyncHandler(async (req, res) => {
  const { uid } = req.params;

  const user = await User.findOne({ firebaseUid: uid, role: ROLES.VOLUNTEER });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Volunteer not found'
    });
  }

  const [volunteer, taskStats] = await Promise.all([
    Volunteer.findOne({ user: user._id }).lean(),
    Report.aggregate([
      { $match: { assignedTo: uid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $in: ['$status', ['assigned', 'in_progress']] }, 1, 0] } },
        }
      }
    ])
  ]);

  const stats = taskStats[0] || { total: 0, resolved: 0, inProgress: 0 };

  res.json({
    success: true,
    data: {
      name: user.name,
      avatar: user.avatar,
      stats: volunteer?.stats || {},
      taskStats: {
        total: stats.total,
        resolved: stats.resolved,
        inProgress: stats.inProgress,
        completionRate: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0
      }
    }
  });
}));

export default router;
