import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    index: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  location: {
    lat: {
      type: Number,
      required: [true, 'Latitude is required']
    },
    lng: {
      type: Number,
      required: [true, 'Longitude is required']
    }
  },
  wasteType: {
    type: String,
    enum: ['general', 'recyclable', 'organic', 'construction', 'hazardous'],
    default: 'general'
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'resolved'],
    default: 'pending'
  },
  assignedTo: {
    type: String,
    default: null
  },
}, {
  timestamps: true  // auto-manages createdAt + updatedAt
});

// Indexes for faster analytics queries
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ wasteType: 1 });
reportSchema.index({ urgency: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
