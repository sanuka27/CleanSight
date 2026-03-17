import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    actorUid: {
      type: String,
      required: true,
    },
    actorEmail: {
      type: String,
      default: null,
    },
    actorRole: {
      type: String,
      enum: ['admin', 'staff', 'system'],
      default: 'admin',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'REPORT_STATUS_CHANGED',
        'REPORT_ASSIGNED',
        'REPORT_NOTE_ADDED',
        'REPORTS_BULK_ASSIGNED',
        'REPORTS_BULK_STATUS_UPDATED',
        'REPORTS_BULK_REJECTED',
        'REPORTS_BULK_EXPORTED',
        'REPORT_ML_REVIEW',
        'DOCUMENT_UPLOADED',
        'DOCUMENT_DELETED',
        'SETTINGS_UPDATED',
        'USER_ROLE_CHANGED',
        'USER_SUSPENDED',
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: ['report', 'document', 'settings', 'user'],
    },
    entityId: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for the common list query (newest first)
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorUid: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
