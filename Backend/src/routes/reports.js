import express from 'express';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/reports
// @desc    Get all reports (with filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, wasteType, urgency, limit = 20, page = 1 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (wasteType) query.wasteType = wasteType;
    if (urgency) query.urgency = urgency;

    const reports = await Report.find(query)
      .populate('reporter', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      count: reports.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reports/nearby
// @desc    Get reports near a location
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    }).populate('reporter', 'name avatar');

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Get single report
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name avatar email')
      .populate('assignedVolunteer', 'name avatar');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/reports
// @desc    Create a new report
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, wasteType, urgency, location, images, aiAnalysis } = req.body;

    const report = await Report.create({
      reporter: req.user.id,
      title,
      description,
      wasteType,
      urgency,
      location,
      images,
      aiAnalysis
    });

    // Update user's report count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { reportsSubmitted: 1 }
    });

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/reports/:id/status
// @desc    Update report status
// @access  Private (admin, municipal, volunteer)
router.put('/:id/status', protect, authorize('admin', 'municipal', 'volunteer'), async (req, res) => {
  try {
    const { status } = req.body;

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        ...(status === 'completed' && { completedAt: new Date() })
      },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/reports/stats/overview
// @desc    Get report statistics
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalReports = await Report.countDocuments();
    const totalVolunteers = await User.countDocuments({ role: 'volunteer' });

    res.json({
      success: true,
      data: {
        totalReports,
        totalVolunteers,
        byStatus: stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
