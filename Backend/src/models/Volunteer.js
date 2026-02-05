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
      default: 'Point'
    },
    coordinates: [Number],
    radius: {
      type: Number,
      default: 5 // km
    }
  }],
  stats: {
    totalCleanups: { type: Number, default: 0 },
    hoursVolunteered: { type: Number, default: 0 },
    reportsResolved: { type: Number, default: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 }
  },
  badges: [{
    name: String,
    earnedAt: Date,
    icon: String
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

const Volunteer = mongoose.model('Volunteer', volunteerSchema);

export default Volunteer;
