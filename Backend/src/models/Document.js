import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    trim: true,
  },
  url: {
    type: String,
    required: [true, 'Document URL is required'],
  },
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'docx', 'xlsx', 'csv', 'image', 'other'],
    default: 'pdf',
  },
  fileSize: {
    type: Number,          // bytes
    default: 0,
  },
  category: {
    type: String,
    enum: ['sop', 'policy', 'report', 'guide', 'other'],
    default: 'other',
  },
  uploadedBy: {
    type: String,          // firebaseUid of admin who uploaded
    required: true,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
}, {
  timestamps: true,
});

documentSchema.index({ createdAt: -1 });
documentSchema.index({ category: 1 });

const Document = mongoose.model('Document', documentSchema);
export default Document;
