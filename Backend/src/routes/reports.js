import express from 'express';
import Report from '../models/Report.js';
import User from '../models/User.js';
import verifyToken from '../middleware/verifyToken.js';

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

export default router;
