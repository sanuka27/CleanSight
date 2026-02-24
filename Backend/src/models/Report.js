import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: [true, 'Firebase UID is required'],
    index: true
  },
  title: {
    type: String,
    maxlength: [120, 'Title cannot be more than 120 characters'],
    default: null
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

// 2dsphere index for geospatial queries (near, within bbox)
reportSchema.index({ location: '2dsphere' });

// Indexes for faster analytics queries
reportSchema.index({ status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ wasteType: 1 });
reportSchema.index({ urgency: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
