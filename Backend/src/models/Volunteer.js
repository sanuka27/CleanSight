import mongoose from 'mongoose';

const volunteerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bio: {
    type: String,
    maxlength: [300, 'Bio cannot be more than 300 characters']
  },
  skills: [{
    type: String,
    enum: ['waste-sorting', 'heavy-lifting', 'driving', 'coordination', 'community-outreach']
  }],
  availability: {
    type: String,
    enum: ['weekdays', 'weekends', 'flexible', 'evenings'],
    default: 'flexible'
  },
  preferredAreas: [{
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v) {
          if (!Array.isArray(v) || v.length !== 2) return false;
          return v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    },
    radius: {
      type: Number,
      default: 5, // km
      min: 1,
      max: 100
    }
  }],
  stats: {
    totalCleanups: { type: Number, default: 0 },
    hoursVolunteered: { type: Number, default: 0 },
    reportsResolved: { type: Number, default: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 }
  },
  badges: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    earnedAt: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  currentTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  }]
}, {
  timestamps: true
});

volunteerSchema.index({ 'preferredAreas': '2dsphere' });
volunteerSchema.index({ isActive: 1 });

const Volunteer = mongoose.model('Volunteer', volunteerSchema);

export default Volunteer;
