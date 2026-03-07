import express from 'express';
import mongoose from 'mongoose';
import { adminOnly } from '../middleware/adminAuth.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Volunteer from '../models/Volunteer.js';
import Document from '../models/Document.js';
import Settings from '../models/Settings.js';

const router = express.Router();

// All routes require admin auth
router.use(adminOnly);

/* ═══════════════════════════════════════════════════════════════════
   REPORTS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/reports
 * Paginated, filtered, sorted report list.
 */
router.get('/reports', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      wasteType,
      urgency,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      from,
      to,
      assignedTo,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter = {};

    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length) filter.status = { $in: statuses };
    }
    if (wasteType) {
      const types = String(wasteType).split(',').map(s => s.trim()).filter(Boolean);
      if (types.length) filter.wasteType = { $in: types };
    }
    if (urgency) {
      const urgencies = String(urgency).split(',').map(s => s.trim()).filter(Boolean);
      if (urgencies.length) filter.urgency = { $in: urgencies };
    }
    if (assignedTo) {
      filter.assignedTo = String(assignedTo);
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(String(from));
      if (to)   filter.createdAt.$lte = new Date(String(to));
    }

    // Text search on description + title (case-insensitive, injection-safe)
    if (search && String(search).trim()) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortField = ['createdAt', 'updatedAt', 'urgency', 'status'].includes(String(sortBy))
      ? String(sortBy)
      : 'createdAt';

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(filter),
    ]);

    // Enrich with reporter name
    const uids = [...new Set(reports.map(r => r.firebaseUid))];
    const users = await User.find({ firebaseUid: { $in: uids } })
      .select('firebaseUid name email avatar')
      .lean();
    const userMap = Object.fromEntries(users.map(u => [u.firebaseUid, u]));

    // Enrich with assigned volunteer name
    const assignedUids = [...new Set(reports.map(r => r.assignedTo).filter(Boolean))];
    const assignedUsers = await User.find({ firebaseUid: { $in: assignedUids } })
      .select('firebaseUid name email')
      .lean();
    const assignedMap = Object.fromEntries(assignedUsers.map(u => [u.firebaseUid, u]));

    const enriched = reports.map(r => ({
      ...r,
      reporter: userMap[r.firebaseUid] || null,
      assignedVolunteer: r.assignedTo ? assignedMap[r.assignedTo] || { firebaseUid: r.assignedTo } : null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Admin get reports error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/reports/:id
 * Full report details with reporter info.
 */
router.get('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }

    const report = await Report.findById(id).lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const [reporter, assignedVolunteer] = await Promise.all([
      User.findOne({ firebaseUid: report.firebaseUid }).select('name email avatar reportsSubmitted createdAt').lean(),
      report.assignedTo
        ? User.findOne({ firebaseUid: report.assignedTo }).select('name email avatar cleanupsCompleted').lean()
        : null,
    ]);

    res.json({
      success: true,
      data: {
        ...report,
        reporter: reporter || null,
        assignedVolunteer: assignedVolunteer || null,
      },
    });
  } catch (err) {
    console.error('Admin get report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/status
 * Admin status update with extended transitions.
 */
router.patch('/reports/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }

    const VALID_STATUSES = ['pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const $set = { status };
    const $unset = {};
    if (status === 'rejected') {
      $set.rejectionReason = rejectionReason || 'No reason provided';
    } else {
      $unset.rejectionReason = '';
    }
    if (status === 'resolved') {
      $set.resolvedAt = new Date();
    } else {
      $unset.resolvedAt = '';
    }
    const update = Object.keys($unset).length ? { $set, $unset } : { $set };

    const report = await Report.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Admin update status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/admin/reports/:id/assign
 * Assign report to a volunteer.
 */
router.patch('/reports/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { volunteerUid } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }
    if (!volunteerUid) {
      return res.status(400).json({ success: false, message: 'volunteerUid is required' });
    }

    // Verify volunteer exists
    const volunteer = await User.findOne({ firebaseUid: volunteerUid, role: 'volunteer' });
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      {
        $set: { assignedTo: volunteerUid, status: 'assigned' },
        $unset: { rejectionReason: '', resolvedAt: '' },
      },
      { new: true }
    ).lean();

    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Admin assign report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/reports/:id/note
 * Add/update admin note on a report.
 */
router.post('/reports/:id/note', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID' });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { adminNote: note || '' },
      { new: true }
    ).lean();

    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Admin note error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/reports/export/csv
 * Export reports as CSV (returns JSON array for frontend to render).
 */
router.get('/reports/export/csv', async (req, res) => {
  try {
    const { from, to, status, wasteType } = req.query;
    const filter = {};

    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length) filter.status = { $in: statuses };
    }
    if (wasteType) {
      const types = String(wasteType).split(',').map(s => s.trim()).filter(Boolean);
      if (types.length) filter.wasteType = { $in: types };
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(String(from));
      if (to)   filter.createdAt.$lte = new Date(String(to));
    }

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const rows = reports.map(r => ({
      id: r._id.toString(),
      title: r.title || '',
      description: r.description,
      status: r.status,
      wasteType: r.wasteType,
      urgency: r.urgency,
      lat: r.location?.coordinates?.[1] ?? '',
      lng: r.location?.coordinates?.[0] ?? '',
      reporterUid: r.firebaseUid,
      assignedTo: r.assignedTo || '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      resolvedAt: r.resolvedAt || '',
    }));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Admin export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   VOLUNTEERS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/volunteers
 * List all volunteers with stats.
 */
router.get('/volunteers', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Users with role=volunteer
    const userFilter = { role: 'volunteer' };
    if (search && String(search).trim()) {
      const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      userFilter.$or = [{ name: rx }, { email: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(userFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(userFilter),
    ]);

    const uids = users.map(u => u.firebaseUid);

    // Get volunteer profiles
    const volProfiles = await Volunteer.find({ user: { $in: users.map(u => u._id) } })
      .lean();
    const volByUser = Object.fromEntries(volProfiles.map(v => [v.user.toString(), v]));

    // Get assignment stats from Reports
    const assignmentStats = await Report.aggregate([
      { $match: { assignedTo: { $in: uids } } },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        },
      },
    ]);
    const statsMap = Object.fromEntries(assignmentStats.map(s => [s._id, s]));

    const enriched = users.map(u => {
      const profile = volByUser[u._id.toString()];
      const stats = statsMap[u.firebaseUid] || { assigned: 0, resolved: 0, inProgress: 0 };
      return {
        ...u,
        volunteerProfile: profile || null,
        stats: {
          assigned: stats.assigned,
          resolved: stats.resolved,
          inProgress: stats.inProgress,
          completionRate: stats.assigned > 0
            ? Math.round((stats.resolved / stats.assigned) * 100)
            : 0,
        },
        isActive: profile?.isActive ?? true,
      };
    });

    // Filter by isActive if requested
    const filtered = isActive !== undefined
      ? enriched.filter(v => v.isActive === (isActive === 'true'))
      : enriched;

    const effectiveTotal = isActive !== undefined ? filtered.length : total;
    res.json({
      success: true,
      data: filtered,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: effectiveTotal,
        pages: Math.ceil(effectiveTotal / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Admin get volunteers error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/volunteers/:uid
 * Single volunteer profile + tasks.
 */
router.get('/volunteers/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const user = await User.findOne({ firebaseUid: uid }).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [profile, tasks] = await Promise.all([
      Volunteer.findOne({ user: user._id }).lean(),
      Report.find({ assignedTo: uid })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const resolvedCount = tasks.filter(t => t.status === 'resolved').length;
    const inProgressCount = tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length;

    res.json({
      success: true,
      data: {
        user,
        profile: profile || null,
        tasks,
        stats: {
          total: tasks.length,
          resolved: resolvedCount,
          inProgress: inProgressCount,
          completionRate: tasks.length > 0
            ? Math.round((resolvedCount / tasks.length) * 100)
            : 0,
        },
      },
    });
  } catch (err) {
    console.error('Admin get volunteer error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/analytics/overview?range=7d|30d|90d|custom&from=ISO&to=ISO
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const { range = '7d', from, to } = req.query;
    const { start, end } = resolveDateRange(range, from, to);

    const [statusBreakdown, wasteTypes, urgencyBreakdown, userGrowth, resolution] =
      await Promise.all([
        // Status counts
        Report.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        // Waste type counts
        Report.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: '$wasteType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        // Urgency counts
        Report.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: '$urgency', count: { $sum: 1 } } },
        ]),
        // New users in range
        User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        // Avg resolution time (createdAt → resolvedAt, fallback to updatedAt)
        Report.aggregate([
          {
            $match: {
              status: 'resolved',
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $project: {
              resolutionMs: {
                $subtract: [{ $ifNull: ['$resolvedAt', '$updatedAt'] }, '$createdAt'],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgMs: { $avg: '$resolutionMs' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    // Convert status breakdown to object
    const statusMap = {};
    statusBreakdown.forEach(s => { statusMap[s._id] = s.count; });

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      data: {
        totals: {
          total,
          pending:    statusMap.pending    || 0,
          verified:   statusMap.verified   || 0,
          assigned:   statusMap.assigned   || 0,
          inProgress: statusMap.in_progress || 0,
          resolved:   statusMap.resolved   || 0,
          rejected:   statusMap.rejected   || 0,
        },
        rates: {
          resolutionRate: total > 0
            ? Math.round(((statusMap.resolved || 0) / total) * 100)
            : 0,
          assignmentRate: total > 0
            ? Math.round((((statusMap.assigned || 0) + (statusMap.in_progress || 0)) / total) * 100)
            : 0,
        },
        wasteTypes: wasteTypes.map(w => ({ wasteType: w._id, count: w.count })),
        urgencyBreakdown: urgencyBreakdown.map(u => ({ urgency: u._id, count: u.count })),
        newUsers: userGrowth,
        avgResolutionHours: resolution[0]?.avgMs
          ? Math.round(resolution[0].avgMs / 1000 / 3600 * 10) / 10
          : null,
        resolvedCount: resolution[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error('Admin analytics overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/analytics/trends?range=7d|30d|90d&from=ISO&to=ISO
 * Daily report counts split by status.
 */
router.get('/analytics/trends', async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { start, end } = resolveDateRange(range, from, to);

    const pipeline = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ];

    const raw = await Report.aggregate(pipeline);

    // Pivot: { date → { total, resolved, pending, ... } }
    const dateMap = {};
    raw.forEach(r => {
      const { date, status } = r._id;
      if (!dateMap[date]) dateMap[date] = { date, total: 0 };
      dateMap[date][status] = r.count;
      dateMap[date].total += r.count;
    });

    res.json({
      success: true,
      data: Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    console.error('Admin analytics trends error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/analytics/volunteer-performance?range=30d
 */
router.get('/analytics/volunteer-performance', async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { start, end } = resolveDateRange(range, from, to);

    const stats = await Report.aggregate([
      {
        $match: {
          assignedTo: { $ne: null },
          updatedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          avgResolutionMs: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', 'resolved'] }, { $ne: ['$resolvedAt', null] }] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      { $sort: { resolved: -1 } },
      { $limit: 20 },
    ]);

    const uids = stats.map(s => s._id).filter(Boolean);
    const users = await User.find({ firebaseUid: { $in: uids } })
      .select('firebaseUid name email avatar')
      .lean();
    const userMap = Object.fromEntries(users.map(u => [u.firebaseUid, u]));

    const enriched = stats.map(s => ({
      firebaseUid: s._id,
      user: userMap[s._id] || { firebaseUid: s._id, name: 'Unknown' },
      assigned: s.assigned,
      resolved: s.resolved,
      completionRate: s.assigned > 0 ? Math.round((s.resolved / s.assigned) * 100) : 0,
      avgResolutionHours: s.avgResolutionMs
        ? Math.round(s.avgResolutionMs / 1000 / 3600 * 10) / 10
        : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Admin volunteer performance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   DOCUMENTS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/documents
 */
router.get('/documents', async (req, res) => {
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (category) filter.category = String(category);

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: docs,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error('Admin get documents error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/documents
 * Body: { title, url, fileType?, fileSize?, category?, description? }
 */
router.post('/documents', async (req, res) => {
  try {
    const { title, url, fileType, fileSize, category, description } = req.body;

    if (!title || !url) {
      return res.status(400).json({ success: false, message: 'title and url are required' });
    }

    // Validate URL scheme to prevent XSS via javascript: or data: URLs
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ success: false, message: 'URL must use http or https' });
      }
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid URL format' });
    }

    const uploadedBy = req.adminUser?.firebaseUid || 'system';
    const doc = await Document.create({ title, url, fileType, fileSize, category, description, uploadedBy });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('Admin create document error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/admin/documents/:id
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document ID' });
    }

    const doc = await Document.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Admin delete document error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: 'system' },
      { $setOnInsert: { key: 'system' } },
      { new: true, upsert: true }
    ).lean();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/settings
 */
router.put('/settings', async (req, res) => {
  try {
    const allowedFields = [
      'reportAutoExpiryDays',
      'mapDefaultRadiusKm',
      'severityThresholds',
      'allowVolunteerSelfAssign',
      'requireImageForReport',
      'maxReportsPerDay',
    ];

    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'system' },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   USERS (admin user list)
═══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/users
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};

    if (role) filter.role = String(role);
    if (search && String(search).trim()) {
      const rx = new RegExp(String(search).trim(), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════
   HELPER
═══════════════════════════════════════════════════════════════════ */

function resolveDateRange(range, from, to) {
  if (from && to) {
    return { start: new Date(from), end: new Date(to) };
  }
  const end = new Date();
  const start = new Date();
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  start.setDate(start.getDate() - days);
  return { start, end };
}

export default router;
