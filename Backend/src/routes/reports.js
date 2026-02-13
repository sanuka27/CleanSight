import express from 'express';
import mongoose from 'mongoose';
import Report from '../models/Report.js';
import User from '../models/User.js';
import verifyToken from '../middleware/verifyToken.js';

// Helper: Valid status transitions
const isValidTransition = (currentStatus, newStatus) => {
  const transitions = {
    pending: ['assigned'],
    assigned: ['resolved'],
    resolved: []
  };
  return transitions[currentStatus]?.includes(newStatus);
};

const router = express.Router();

// @route   POST /api/reports
// @desc    Create a new report
// @access  Private (any authenticated user)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { firebaseUid } = req.user;
    const { imageUrl, description, location, wasteType, urgency } = req.body;

    // Validate required fields
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Image URL is required' });
    }
    if (!description) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ success: false, message: 'Valid location (lat, lng) is required' });
    }

    const report = await Report.create({
      firebaseUid,
      imageUrl,
      description,
      location: { lat: location.lat, lng: location.lng },
      wasteType: wasteType || 'general',
      urgency: urgency || 'medium',
      status: 'pending'
    });

    // Increment user's report count
    await User.findOneAndUpdate(
      { firebaseUid },
      { $inc: { reportsSubmitted: 1 } }
    );

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reports/my
// @desc    Get current user's reports
// @access  Private
router.get('/my', verifyToken, async (req, res) => {
  try {
    const { firebaseUid } = req.user;

    const reports = await Report.find({ firebaseUid })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reports
// @desc    Get reports (citizens see own, volunteer/staff/admin see all)
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const { firebaseUid } = req.user;

    // Look up the user's role
    const user = await User.findOne({ firebaseUid });
    const role = user?.role || 'citizen';

    let query = {};
    if (role === 'citizen') {
      // Citizens can only see their own reports
      query = { firebaseUid };
    }
    // volunteer, staff, admin see all reports

    const reports = await Report.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reports/volunteers
// @desc    Get volunteer users for assignment (staff/admin only)
// @access  Private (staff/admin)
router.get('/volunteers', verifyToken, async (req, res) => {
  try {
    const { firebaseUid } = req.user;
    const user = await User.findOne({ firebaseUid });
    if (!user || !['staff', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Only staff or admin can view volunteers' });
    }
    const volunteers = await User.find({ role: 'volunteer' }).select('firebaseUid name email');
    res.json({ success: true, data: volunteers });
  } catch (error) {
    console.error('Get volunteers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/reports/:id/assign-self
// @desc    Volunteer self-assigns a pending report
// @access  Private (volunteer only)
router.patch('/:id/assign-self', verifyToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Assign-self error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/reports/:id/assign
// @desc    Staff/Admin assigns a pending report to a volunteer
// @access  Private (staff/admin only)
router.patch('/:id/assign', verifyToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Assign report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/reports/:id/status
// @desc    Update report status with transition validation
// @access  Private (role-based)
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { firebaseUid } = req.user;
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }
    if (!newStatus || !['assigned', 'resolved'].includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // Always verify role from DB
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Citizens cannot update status
    if (user.role === 'citizen') {
      return res.status(403).json({ success: false, message: 'Citizens cannot update report status' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Validate transition
    if (!isValidTransition(report.status, newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition from '${report.status}' to '${newStatus}'`
      });
    }

    // Permission checks
    if (newStatus === 'assigned') {
      if (!['staff', 'admin'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Only staff or admin can assign reports via status update' });
      }
    }

    if (newStatus === 'resolved') {
      if (user.role === 'volunteer' && report.assignedTo !== firebaseUid) {
        return res.status(403).json({ success: false, message: 'You can only resolve reports assigned to you' });
      }
      // staff/admin can resolve any report
    }

    report.status = newStatus;
    await report.save();

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
