import mongoose from 'mongoose';

const deletedAccountSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: [500, 'Deletion reason cannot exceed 500 characters'],
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
    deletedByUid: {
      type: String,
      default: null,
    },
    deletedByEmail: {
      type: String,
      default: null,
    },
    targetEmail: {
      type: String,
      default: null,
    },
    targetName: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

deletedAccountSchema.index({ deletedAt: -1 });

const DeletedAccount = mongoose.model('DeletedAccount', deletedAccountSchema);
export default DeletedAccount;
