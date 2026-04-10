import mongoose from 'mongoose';
import { ALL_ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  role: {
    type: String,
    enum: {
      values: ALL_ROLES,
      message: '{VALUE} is not a valid role'
    },
    default: 'citizen',
    index: true
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false,
    index: true
  },
  suspendedReason: {
    type: String,
    default: null,
    maxlength: [500, 'Suspension reason cannot exceed 500 characters']
  },
  suspendedAt: {
    type: Date,
    default: null
  },
  updatedByUid: {
    type: String,
    default: null
  },
  reportsSubmitted: {
    type: Number,
    default: 0,
    min: [0, 'Reports submitted cannot be negative']
  },
  cleanupsCompleted: {
    type: Number,
    default: 0,
    min: [0, 'Cleanups completed cannot be negative']
  },
  lastActiveAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for common query patterns
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ isSuspended: 1, role: 1 });
userSchema.index({ email: 1, firebaseUid: 1 });

// Instance method to check if user can perform action
userSchema.methods.canPerformAction = function(action) {
  const rolePermissions = {
    citizen: ['view_own_reports', 'create_report', 'update_profile'],
    volunteer: ['view_own_reports', 'create_report', 'update_profile', 'claim_reports', 'resolve_reports'],
    staff: ['view_all_reports', 'assign_reports', 'manage_volunteers', 'view_analytics', 'resolve_reports'],
    admin: ['all']
  };

  const permissions = rolePermissions[this.role] || [];
  return permissions.includes('all') || permissions.includes(action);
};

// Static method to find active volunteers
userSchema.statics.findActiveVolunteers = function() {
  return this.find({ 
    role: 'volunteer', 
    isSuspended: { $ne: true } 
  }).select('firebaseUid name email avatar');
};

// Pre-save hook to update lastActiveAt
userSchema.pre('save', function(next) {
  if (this.isModified('reportsSubmitted') || this.isModified('cleanupsCompleted')) {
    this.lastActiveAt = new Date();
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
