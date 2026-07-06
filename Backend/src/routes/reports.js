import express from 'express';
import mongoose from 'mongoose';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Volunteer from '../models/Volunteer.js';
import verifyToken from '../middleware/verifyToken.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { predictCategoryWithML, validateImageWithML } from '../services/mlService.js';
import { awardCitizenBadges } from '../services/badgeService.js';
import { recordVolunteerResolutions } from '../services/volunteerProgressService.js';
import { 
  REPORT_STATUS, 
  isValidTransition, 
} from '../constants/reportStatus.js';
import { ROLES } from '../constants/roles.js';
import { reportRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Valid waste types and urgency levels
const VALID_WASTE_TYPES = ['general', 'recyclable', 'organic', 'construction', 'hazardous'];
const VALID_URGENCY_LEVELS = ['low', 'medium', 'high'];

/* ------------------------------------------------------------------
 * Issue 7 — Async ML analysis
 * Runs Phase 1 (binary validation) and Phase 2 (category prediction)
 * after the HTTP response has already been sent. Updates the Report
 * document in-place. Uses setImmediate as a stopgap until a proper
 * job queue (ARCH-008) is in place.
 * ------------------------------------------------------------------ */
async function runMlAnalysis(reportId, imageUrl) {
  let imageValidationLabel = 'error';
  let imageValidationConfidence = null;
  let aiReviewStatus = 'manual_review';
  let wasteCategoryPredictedLabel = 'pending';
  let wasteCategoryConfidence = null;
  let wasteCategoryEntropy = null;
  let wasteCategoryConfidenceLevel = null;
  let wasteCategoryAllPredictions = null;
  let wasteCategoryReviewStatus = 'manual_review';

  try {
    const mlValidation = await validateImageWithML(imageUrl);

    if (mlValidation.success) {
      imageValidationLabel = mlValidation.label;
      imageValidationConfidence = mlValidation.confidence;

      if (imageValidationLabel === 'non-trash') {
        aiReviewStatus = 'flagged';
      } else if (mlValidation.recommendation === 'manual_review') {
        aiReviewStatus = 'manual_review';
      } else {
        aiReviewStatus = 'approved';
      }

      if (imageValidationLabel === 'trash') {
        const categoryPrediction = await predictCategoryWithML(imageUrl);

        if (categoryPrediction.success) {
          wasteCategoryPredictedLabel = categoryPrediction.predictedLabel;
          wasteCategoryConfidence = categoryPrediction.confidence;
          wasteCategoryEntropy = categoryPrediction.entropy;
          wasteCategoryConfidenceLevel = categoryPrediction.confidenceLevel;
          wasteCategoryAllPredictions = categoryPrediction.allPredictions;
          wasteCategoryReviewStatus = categoryPrediction.reviewStatus;
          if (aiReviewStatus !== 'approved') {
            wasteCategoryReviewStatus = 'manual_review';
          }
        } else {
          console.warn('[ML] Phase 2 prediction failed:', categoryPrediction.error);
          wasteCategoryPredictedLabel = 'error';
          wasteCategoryReviewStatus = 'manual_review';
        }
      }
    } else {
      console.warn('[ML] Phase 1 validation failed:', mlValidation.error);
    }
  } catch (err) {
    console.error('[ML] runMlAnalysis threw unexpectedly:', err);
  }

  // Persist ML results back onto the report
  await Report.findByIdAndUpdate(reportId, {
    imageValidationLabel,
    imageValidationConfidence,
    aiReviewStatus,
    wasteCategoryPredictedLabel,
    wasteCategoryConfidence,
    wasteCategoryEntropy,
    wasteCategoryConfidenceLevel,
    wasteCategoryAllPredictions,
    wasteCategoryReviewStatus,
  });
}



// @route   POST /api/reports
// @desc    Create a new report
// @access  Private (any authenticated user)
router.post('/', reportRateLimit, verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;
  const { imageUrl, description, location, wasteType, urgency, title } = req.body;

  // Validate required fields
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return res.status(400).json({ success: false, message: 'Image URL is required' });
  }
  
  // Basic URL validation
  try {
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return res.status(400).json({ success: false, message: 'Image URL must use http or https' });
    }
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid image URL format' });
  }
  
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ success: false, message: 'Description is required (minimum 10 characters)' });
  }
  
  if (description.length > 500) {
    return res.status(400).json({ success: false, message: 'Description cannot exceed 500 characters' });
  }
  
  // Validate location
  if (!location || typeof location !== 'object') {
    return res.status(400).json({ success: false, message: 'Location is required' });
  }
  
  const lat = location.lat ?? location.latitude;
  const lng = location.lng ?? location.longitude;
  
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ success: false, message: 'Valid location (lat, lng) is required as numbers' });
  }
  
  if (lat < -90 || lat > 90) {
    return res.status(400).json({ success: false, message: 'Latitude must be between -90 and 90' });
  }
  
  if (lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, message: 'Longitude must be between -180 and 180' });
  }
  
  // Validate optional fields
  const finalWasteType = wasteType ? String(wasteType).toLowerCase() : 'general';
  if (!VALID_WASTE_TYPES.includes(finalWasteType)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid waste type. Must be one of: ${VALID_WASTE_TYPES.join(', ')}` 
    });
  }
  
  const finalUrgency = urgency ? String(urgency).toLowerCase() : 'medium';
  if (!VALID_URGENCY_LEVELS.includes(finalUrgency)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid urgency level. Must be one of: ${VALID_URGENCY_LEVELS.join(', ')}` 
    });
  }

  // Issue 7: Save the report immediately with aiReviewStatus 'pending' so the
  // user gets a fast 201 response. ML inference runs in the background via
  // setImmediate (stopgap — see BACKGROUND_JOBS.md / ARCH-008 for the proper
  // queue solution).
  const report = await Report.create({
    firebaseUid,
    title: title ? String(title).trim().slice(0, 120) : null,
    imageUrl: imageUrl.trim(),
    description: description.trim(),
    location: {
      type: 'Point',
      coordinates: [lng, lat], // GeoJSON: [lng, lat]
    },
    wasteType: finalWasteType,
    urgency: finalUrgency,
    status: REPORT_STATUS.PENDING,
    // ML fields initialised to pending — updated asynchronously by runMlAnalysis
    imageValidationLabel: 'pending',
    imageValidationConfidence: null,
    aiReviewStatus: 'pending',
    wasteCategoryPredictedLabel: 'pending',
    wasteCategoryConfidence: null,
    wasteCategoryEntropy: null,
    wasteCategoryConfidenceLevel: null,
    wasteCategoryAllPredictions: null,
    wasteCategoryReviewStatus: 'pending',
  });

  // Increment user's report count
  const updatedUser = await User.findOneAndUpdate(
    { firebaseUid },
    { $inc: { reportsSubmitted: 1 } },
    { new: true }
  );

  let newlyEarnedBadges = [];
  if (updatedUser && updatedUser.role === ROLES.CITIZEN) {
    newlyEarnedBadges = await awardCitizenBadges(updatedUser);
  }

  res.status(201).json({
    success: true,
    data: report,
    newlyEarnedBadges,
    mlStatus: 'pending', // ML results will be available shortly via GET /:id
  });

  // Fire ML analysis after the response is sent
  setImmediate(() => {
    runMlAnalysis(report._id, imageUrl.trim()).catch((err) =>
      console.error('[ML] Background analysis failed for report', report._id, err)
    );
  });
}));

// @route   GET /api/reports/my
// @desc    Get current user's reports (paginated)
// @access  Private
// Issue 6: Added pagination — previously unbounded, could return thousands of rows.
router.get('/my', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;

  const MAX_LIMIT = 200;
  const DEFAULT_LIMIT = 50;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const baseQuery = { firebaseUid, isDeleted: { $ne: true } };

  const [reports, total] = await Promise.all([
    Report.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments(baseQuery),
  ]);

  res.json({
    success: true,
    count: reports.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
    data: reports,
  });
}));

// @route   GET /api/reports/volunteers
// @desc    Get volunteer users for assignment (staff/admin only)
// @access  Private (staff/admin)
// NOTE: Must be defined BEFORE /:id to prevent Express matching 'volunteers' as an :id param
router.get('/volunteers', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;
  const user = await User.findOne({ firebaseUid });
  if (!user || !['staff', 'admin'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Only staff or admin can view volunteers' });
  }
  const volunteers = await User.find({ role: 'volunteer' }).select('firebaseUid name email');
  res.json({ success: true, data: volunteers });
}));

// @route   GET /api/reports/:id
// @desc    Get a single report by ID (full details)
// @access  Private
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid report ID' });
  }

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  res.json({ success: true, data: report });
}));

// @route   GET /api/reports
// @desc    Get reports with map-ready filters (status, bbox, near, mine)
// @access  Private
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;

  // Look up the user's role
  const user = await User.findOne({ firebaseUid });
  const role = user?.role || 'citizen';

  // Exclude soft-deleted reports
  let query = { isDeleted: { $ne: true } };

  // "mine" filter: citizen sees only own reports when mine=true or by default
  if (req.query.mine === 'true' || role === 'citizen') {
    query.firebaseUid = firebaseUid;
  }
  // volunteer, staff, admin see all reports (unless mine=true was explicitly set)

  // Status filter: ?status=pending,assigned  (comma-separated)
  if (req.query.status) {
    const statuses = req.query.status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      query.status = { $in: statuses };
    }
  }

  // Bounding box filter: ?bbox=west,south,east,north
  if (req.query.bbox) {
    const parts = req.query.bbox.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      const [west, south, east, north] = parts;
      query.location = {
        ...query.location,
        $geoWithin: {
          $box: [
            [west, south],
            [east, north]
          ]
        }
      };
    }
  }

  // Near filter: ?near=lat,lng,radiusKm
  if (req.query.near) {
    const parts = req.query.near.split(',').map(Number);
    if (parts.length === 3 && parts.every(n => !isNaN(n))) {
      const [lat, lng, radiusKm] = parts;
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusKm * 1000  // convert km to meters
        }
      };
    }
  }

  // Select lightweight fields for map (full details via /:id)
  const reports = await Report.find(query)
    .select('title description status wasteType urgency imageUrl location createdAt firebaseUid assignedTo')
    .sort({ createdAt: -1 })
    .limit(500);  // safety limit for map

  res.json({
    success: true,
    count: reports.length,
    data: reports
  });
}));

// NOTE: GET /api/reports/volunteers is defined above GET /:id (see above)

// @route   PATCH /api/reports/:id/assign-self
// @desc    Volunteer self-assigns a pending report
// @access  Private (volunteer only)
router.patch('/:id/assign-self', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid report ID' });
  }

  // Always verify role from DB
  const user = await User.findOne({ firebaseUid });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (user.role !== 'volunteer') {
    return res.status(403).json({ success: false, message: 'Only volunteers can self-assign reports' });
  }

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }
  if (report.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Only pending reports can be assigned' });
  }

  report.status = 'assigned';
  report.assignedTo = firebaseUid;
  await report.save();

  res.json({ success: true, data: report });
}));

// @route   PATCH /api/reports/:id/assign
// @desc    Staff/Admin assigns a pending report to a volunteer
// @access  Private (staff/admin only)
router.patch('/:id/assign', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;
  const { id } = req.params;
  const { volunteerUid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid report ID' });
  }
  if (!volunteerUid) {
    return res.status(400).json({ success: false, message: 'volunteerUid is required' });
  }

  // Verify role from DB
  const user = await User.findOne({ firebaseUid });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (!['staff', 'admin'].includes(user.role)) {
    return res.status(403).json({ success: false, message: 'Only staff or admin can assign reports' });
  }

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }
  if (report.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Only pending reports can be assigned' });
  }

  // Ensure target user is a volunteer
  const volunteer = await User.findOne({ firebaseUid: volunteerUid });
  if (!volunteer || volunteer.role !== 'volunteer') {
    return res.status(400).json({ success: false, message: 'Target user is not a volunteer' });
  }

  report.status = 'assigned';
  report.assignedTo = volunteerUid;
  await report.save();

  res.json({ success: true, data: report });
}));

// @route   PATCH /api/reports/:id/status
// @desc    Update report status with transition validation
// @access  Private (role-based)
router.patch('/:id/status', verifyToken, asyncHandler(async (req, res) => {
  const { firebaseUid } = req.user;
  const { id } = req.params;
  const { status: newStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid report ID' });
  }
  
  // Validate against allowed statuses for this endpoint
  const allowedStatuses = [
    REPORT_STATUS.ASSIGNED, 
    REPORT_STATUS.IN_PROGRESS, 
    REPORT_STATUS.RESOLVED
  ];
  if (!newStatus || !allowedStatuses.includes(newStatus)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid status value. Allowed: ${allowedStatuses.join(', ')}` 
    });
  }

  // Always verify role from DB
  const user = await User.findOne({ firebaseUid });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Citizens cannot update status
  if (user.role === ROLES.CITIZEN) {
    return res.status(403).json({ success: false, message: 'Citizens cannot update report status' });
  }

  const report = await Report.findById(id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  const previousStatus = report.status;

  // Validate transition using centralized logic
  if (!isValidTransition(report.status, newStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid transition from '${report.status}' to '${newStatus}'`
    });
  }

  // Permission checks
  if (newStatus === REPORT_STATUS.ASSIGNED) {
    if (![ROLES.STAFF, ROLES.ADMIN].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Only staff or admin can assign reports via status update' });
    }
  }

  if (newStatus === REPORT_STATUS.RESOLVED) {
    if (user.role === ROLES.VOLUNTEER && report.assignedTo !== firebaseUid) {
      return res.status(403).json({ success: false, message: 'You can only resolve reports assigned to you' });
    }
    // Set resolvedAt timestamp
    report.resolvedAt = new Date();
    report.resolvedByUid = firebaseUid;
  }

  report.status = newStatus;
  await report.save();

  // Issue 3: Remove report from the volunteer's currentTasks when it reaches a
  // terminal state (resolved or rejected). Without this, stale tasks accumulate
  // indefinitely in Volunteer.currentTasks.
  if (
    [REPORT_STATUS.RESOLVED, REPORT_STATUS.REJECTED].includes(newStatus) &&
    report.assignedTo
  ) {
    try {
      const assignedUser = await User.findOne({ firebaseUid: report.assignedTo });
      if (assignedUser) {
        await Volunteer.updateOne(
          { user: assignedUser._id },
          { $pull: { currentTasks: report._id } }
        );
      }
    } catch (err) {
      // Non-fatal: log and continue — the status update already succeeded.
      console.error('[currentTasks] Failed to remove task from volunteer:', err);
    }
  }

  // Issue 5: Wrap badge/stats recalculation in try/catch so a failure here
  // does not fail the status update response.
  if (newStatus === REPORT_STATUS.RESOLVED && previousStatus !== REPORT_STATUS.RESOLVED) {
    try {
      await recordVolunteerResolutions([report.assignedTo]);
    } catch (err) {
      console.error('[volunteerProgress] recordVolunteerResolutions failed:', err);
    }
  }

  res.json({ success: true, data: report });
}));

export default router;
