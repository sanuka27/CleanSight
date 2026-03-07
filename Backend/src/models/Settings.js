import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'system',
  },
  reportAutoExpiryDays: {
    type: Number,
    default: 90,
    min: 1,
    max: 365,
  },
  mapDefaultRadiusKm: {
    type: Number,
    default: 10,
    min: 1,
    max: 100,
  },
  severityThresholds: {
    lowUrgencyDays: { type: Number, default: 14 },
    mediumUrgencyDays: { type: Number, default: 7 },
    highUrgencyDays: { type: Number, default: 2 },
  },
  allowVolunteerSelfAssign: {
    type: Boolean,
    default: true,
  },
  requireImageForReport: {
    type: Boolean,
    default: true,
  },
  maxReportsPerDay: {
    type: Number,
    default: 50,
    min: 1,
  },
}, {
  timestamps: true,
});

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
