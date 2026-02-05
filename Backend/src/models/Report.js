import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  wasteType: {
    type: String,
    enum: ['general', 'recyclable', 'organic', 'construction', 'hazardous'],
    required: [true, 'Please specify waste type']
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'assigned', 'in-progress', 'completed', 'rejected'],
    default: 'pending'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Please provide location coordinates']
    },
    address: String
  },
  images: [{
    url: String,
    publicId: String
  }],
  aiAnalysis: {
    wasteDetected: Boolean,
    confidence: Number,
    suggestedType: String
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
reportSchema.index({ location: '2dsphere' });

// Index for faster status queries
reportSchema.index({ status: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
