import express from 'express';
import Volunteer from '../models/Volunteer.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/volunteers
// @desc    Get all volunteers
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { isActive, availability, limit = 20, page = 1 } = req.query;

    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (availability) query.availability = availability;

    const volunteers = await Volunteer.find(query)
      .populate('user', 'name email avatar')
      .sort({ 'stats.totalCleanups': -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Volunteer.countDocuments(query);

    res.json({
      success: true,
      count: volunteers.length,
      total,
      data: volunteers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/volunteers/register
// @desc    Register as a volunteer
// @access  Private
router.post('/register', protect, async (req, res) => {
  try {
    const { bio, skills, availability, preferredAreas } = req.body;

    // Check if already a volunteer
    const existingVolunteer = await Volunteer.findOne({ user: req.user.id });
    if (existingVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as a volunteer'
      });
    }

    // Create volunteer profile
    const volunteer = await Volunteer.create({
      user: req.user.id,
      bio,
      skills,
      availability,
      preferredAreas
    });

    // Update user role
    await User.findByIdAndUpdate(req.user.id, { role: 'volunteer' });

    res.status(201).json({
      success: true,
      data: volunteer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/volunteers/me
// @desc    Get current volunteer profile
// @access  Private (volunteer)
router.get('/me', protect, authorize('volunteer'), async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user.id })
      .populate('user', 'name email avatar')
      .populate('currentTasks');

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/volunteers/me
// @desc    Update volunteer profile
// @access  Private (volunteer)
router.put('/me', protect, authorize('volunteer'), async (req, res) => {
  try {
    const { bio, skills, availability, preferredAreas, isActive } = req.body;

    const volunteer = await Volunteer.findOneAndUpdate(
      { user: req.user.id },
      { bio, skills, availability, preferredAreas, isActive },
      { new: true, runValidators: true }
    ).populate('user', 'name email avatar');

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/volunteers/claim/:reportId
// @desc    Claim a report for cleanup
// @access  Private (volunteer)
router.post('/claim/:reportId', protect, authorize('volunteer'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.assignedVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'Report is already assigned to a volunteer'
      });
    }

    // Assign report to volunteer
    report.assignedVolunteer = req.user.id;
    report.status = 'assigned';
    await report.save();

    // Add to volunteer's current tasks
    await Volunteer.findOneAndUpdate(
      { user: req.user.id },
      { $push: { currentTasks: report._id } }
    );

    res.json({
      success: true,
      message: 'Report claimed successfully',
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/volunteers/leaderboard
// @desc    Get top volunteers leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const volunteers = await Volunteer.find({ isActive: true })
      .populate('user', 'name avatar')
      .sort({ 'stats.totalCleanups': -1 })
      .limit(10);

    res.json({
      success: true,
      data: volunteers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
