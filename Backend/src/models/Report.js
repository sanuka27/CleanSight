import mongoose from 'mongoose';
import { REPORT_STATUS, isValidTransition, isTerminalStatus } from '../constants/reportStatus.js';

const reportSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    index: true
  },
  title: {
    type: String,
    maxlength: [120, 'Title cannot be more than 120 characters'],
    default: null,
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Image URL must be a valid HTTP/HTTPS URL'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot be more than 500 characters'],
    trim: true
  },
  // GeoJSON Point for geospatial queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function (v) {
          return v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 &&
            v[1] >= -90 && v[1] <= 90;
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    }
  },
  wasteType: {
    type: String,
    enum: {
      values: ['general', 'recyclable', 'organic', 'construction', 'hazardous'],
      message: '{VALUE} is not a valid waste type'
    },
    default: 'general'
  },
  urgency: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: '{VALUE} is not a valid urgency level'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: Object.values(REPORT_STATUS),
      message: '{VALUE} is not a valid status'
    },
    default: REPORT_STATUS.PENDING
  },
  assignedTo: {
    type: String,
    default: null,
    index: true
  },
  adminNote: {
    type: String,
    default: null,
    maxlength: [1000, 'Admin note cannot exceed 1000 characters'],
    trim: true
  },
  rejectionReason: {
    type: String,
    default: null,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    trim: true
  },
  // ─────────────────────────────────────────────────────────────────────
  // ML Phase 1: Trash/Non-trash Classification
  // ─────────────────────────────────────────────────────────────────────
  aiReviewStatus: {
    type: String,
    enum: ['approved', 'flagged', 'manual_review', 'pending', 'rejected', 'overridden'],
    default: 'pending'
  },
  imageValidationLabel: {
    type: String,
    enum: ['trash', 'non-trash', 'error', 'pending'],
    default: 'pending'
  },
  imageValidationConfidence: {
    type: Number,
    default: null,
    min: [0, 'Confidence cannot be negative'],
    max: [1, 'Confidence cannot exceed 1']
  },
  finalValidationDecision: {
    type: String,
    enum: ['approved', 'rejected', 'overridden', null],
    default: null
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNote: {
    type: String,
    default: null,
    maxlength: [1000, 'Review note cannot exceed 1000 characters'],
    trim: true
  },
  // ─────────────────────────────────────────────────────────────────────
  // ML Phase 2: Waste Category Classification
  // ─────────────────────────────────────────────────────────────────────
  wasteCategoryPredictedLabel: {
    type: String,
    enum: ['glass', 'mixed', 'paper', 'plastic', 'pending', 'error'],
    default: 'pending'
  },
  wasteCategoryConfidence: {
    type: Number,
    default: null,
    min: [0, 'Confidence cannot be negative'],
    max: [1, 'Confidence cannot exceed 1']
  },
  wasteCategoryEntropy: {
    type: Number,
    default: null,
    min: [0, 'Entropy cannot be negative']
  },
  wasteCategoryConfidenceLevel: {
    type: String,
    enum: ['HIGH', 'MODERATE', 'LOW', 'VERY LOW', null],
    default: null
  },
  wasteCategoryAllPredictions: {
    type: [{
      class: { type: String, required: true },
      confidence: { type: Number, required: true, min: 0, max: 1 }
    }],
    default: null
  },
  wasteCategoryReviewStatus: {
    type: String,
    enum: ['auto_accepted', 'flagged', 'manual_review', 'pending', 'approved', 'overridden', 'rejected'],
    default: 'pending'
  },
  wasteCategoryFinalLabel: {
    type: String,
    enum: ['glass', 'mixed', 'paper', 'plastic', null],
    default: null
  },
  wasteCategoryReviewedBy: {
    type: String,
    default: null
  },
  wasteCategoryReviewedAt: {
    type: Date,
    default: null
  },
  wasteCategoryReviewNote: {
    type: String,
    default: null,
    maxlength: [1000, 'Category review note cannot exceed 1000 characters'],
    trim: true
  },
  // ─────────────────────────────────────────────────────────────────────
  // Resolution tracking
  // ─────────────────────────────────────────────────────────────────────
  resolvedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true  // auto-manages createdAt + updatedAt
});

// ─────────────────────────────────────────────────────────────────────
// Indexes for common query patterns
// ─────────────────────────────────────────────────────────────────────

// 2dsphere index for geospatial queries (near, within bbox)
reportSchema.index({ location: '2dsphere' });

// Primary indexes
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });

// Compound indexes for filtered queries
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ firebaseUid: 1, createdAt: -1 });
reportSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

// Analytics indexes
reportSchema.index({ wasteType: 1 });
reportSchema.index({ urgency: 1 });
reportSchema.index({ wasteCategoryReviewStatus: 1 });
reportSchema.index({ wasteCategoryPredictedLabel: 1 });
reportSchema.index({ aiReviewStatus: 1 });

// ─────────────────────────────────────────────────────────────────────
// Instance Methods
// ─────────────────────────────────────────────────────────────────────

/**
 * Check if status transition is valid
 */
reportSchema.methods.canTransitionTo = function(newStatus) {
  return isValidTransition(this.status, newStatus);
};

/**
 * Check if report is in a terminal state
 */
reportSchema.methods.isTerminal = function() {
  return isTerminalStatus(this.status);
};

/**
 * Check if report can be assigned
 */
reportSchema.methods.canBeAssigned = function() {
  return !this.isTerminal() && this.status !== REPORT_STATUS.ASSIGNED;
};

/**
 * Check if user is the owner of this report
 */
reportSchema.methods.isOwnedBy = function(firebaseUid) {
  return this.firebaseUid === firebaseUid;
};

// ─────────────────────────────────────────────────────────────────────
// Static Methods
// ─────────────────────────────────────────────────────────────────────

/**
 * Find reports near a location
 */
reportSchema.statics.findNear = function(longitude, latitude, maxDistanceMeters = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: maxDistanceMeters
      }
    },
    isDeleted: { $ne: true }
  });
};

/**
 * Find reports within a bounding box
 */
reportSchema.statics.findInBbox = function(west, south, east, north) {
  return this.find({
    location: {
      $geoWithin: {
        $box: [[west, south], [east, north]]
      }
    },
    isDeleted: { $ne: true }
  });
};

// ─────────────────────────────────────────────────────────────────────
// Pre-save hooks
// ─────────────────────────────────────────────────────────────────────

/**
 * Set resolvedAt when status changes to resolved
 */
reportSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === REPORT_STATUS.RESOLVED && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
