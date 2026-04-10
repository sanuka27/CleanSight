import mongoose from 'mongoose';
import { REPORT_STATUS, isValidTransition, isTerminalStatus } from '../constants/reportStatus.js';
import { 
  WASTE_TYPES, 
  URGENCY_LEVELS, 
  AI_REVIEW_STATUSES, 
  IMAGE_VALIDATION_LABELS, 
  FINAL_VALIDATION_DECISIONS,
  PREDICTED_LABELS,
  CONFIDENCE_LEVELS,
  CATEGORY_REVIEW_STATUSES,
  WASTE_CATEGORIES
} from '../constants/reportEnums.js';

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
          if (!Array.isArray(v) || v.length !== 2) return false;
          return v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    }
  },
  wasteType: {
    type: String,
    enum: {
      values: WASTE_TYPES,
      message: '{VALUE} is not a valid waste type'
    },
    default: 'general'
  },
  urgency: {
    type: String,
    enum: {
      values: URGENCY_LEVELS,
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
  assignedAt: {
    type: Date,
    default: null
  },
  assignedByUid: {
    type: String,
    default: null
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
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectedByUid: {
    type: String,
    default: null
  },
  // ─────────────────────────────────────────────────────────────────────
  // ML Phase 1: Trash/Non-trash Classification
  // ─────────────────────────────────────────────────────────────────────
  aiReviewStatus: {
    type: String,
    enum: AI_REVIEW_STATUSES,
    default: 'pending'
  },
  imageValidationLabel: {
    type: String,
    enum: IMAGE_VALIDATION_LABELS,
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
    enum: FINAL_VALIDATION_DECISIONS,
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
    enum: PREDICTED_LABELS,
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
    enum: CONFIDENCE_LEVELS,
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
    enum: CATEGORY_REVIEW_STATUSES,
    default: 'pending'
  },
  wasteCategoryFinalLabel: {
    type: String,
    enum: [...WASTE_CATEGORIES, null],
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
  resolvedByUid: {
    type: String,
    default: null
  },
  resolutionNote: {
    type: String,
    default: null,
    maxlength: [1000, 'Resolution note cannot exceed 1000 characters'],
    trim: true
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

reportSchema.pre('save', function(next) {
  const now = new Date();

  // Track status transitions
  if (this.isModified('status')) {
    if (this.status === REPORT_STATUS.RESOLVED && !this.resolvedAt) {
      this.resolvedAt = now;
    }
    if (this.status === REPORT_STATUS.REJECTED && !this.rejectedAt) {
      this.rejectedAt = now;
    }
    if (this.status === REPORT_STATUS.ASSIGNED && !this.assignedAt) {
      this.assignedAt = now;
    }
  }

  // Ensure soft deletes are timestamped
  if (this.isModified('isDeleted') && this.isDeleted && !this.deletedAt) {
    this.deletedAt = now;
  }

  // Cross-field validations
  if (this.status === REPORT_STATUS.ASSIGNED && !this.assignedTo) {
    return next(new Error('Cannot assign a report without specifying assignedTo'));
  }
  if (this.status === REPORT_STATUS.REJECTED && !this.rejectionReason) {
    return next(new Error('Cannot reject a report without a rejection reason (rejectionReason is required)'));
  }

  next();
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
