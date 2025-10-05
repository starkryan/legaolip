import { Schema, model, Document, mongoose } from 'mongoose';

// Interface for SmsForwarding document
export interface ISmsForwarding extends Document {
  messageId?: string;      // Reference to original SMS message
  devicePort: string;      // Port number (e.g., "1.01")
  sender: string;
  receiver: string;
  message: string;
  timestamp: Date;
  forwardStatus: string;   // pending, success, failed
  mongoId?: string;        // MongoDB document ID
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  forwardedAt?: Date;
}

// SmsForwarding schema
const SmsForwardingSchema = new Schema<ISmsForwarding>({
  messageId: {
    type: String,
    trim: true,
    index: true
  },
  devicePort: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  sender: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  receiver: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  forwardStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', 'retrying'],
    default: 'pending',
    index: true
  },
  mongoId: {
    type: String,
    trim: true,
    index: true
  },
  errorMessage: {
    type: String,
    trim: true
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  forwardedAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'sms_forwarding'
});

// Compound indexes for common queries (not duplicate with field indexes)
SmsForwardingSchema.index({ devicePort: 1, timestamp: -1 });
SmsForwardingSchema.index({ forwardStatus: 1, createdAt: -1 });

// Virtual for checking if forwarding was successful
SmsForwardingSchema.virtual('isSuccessful').get(function() {
  return this.forwardStatus === 'success';
});

SmsForwardingSchema.virtual('isFailed').get(function() {
  return this.forwardStatus === 'failed';
});

SmsForwardingSchema.virtual('canRetry').get(function() {
  return this.forwardStatus === 'failed' && this.retryCount < 3; // Max 3 retries
});

// Pre-save middleware
SmsForwardingSchema.pre('save', function(next) {
  // Set forwardedAt when status changes to success
  if (this.isModified('forwardStatus') && this.forwardStatus === 'success' && !this.forwardedAt) {
    this.forwardedAt = new Date();
  }

  // Update retry count when status changes to retrying
  if (this.isModified('forwardStatus') && this.forwardStatus === 'retrying') {
    this.retryCount += 1;
  }

  next();
});

// Static method to find forwarding records by status
SmsForwardingSchema.statics.findByStatus = function(status: string, limit: number = 100) {
  return this.find({ forwardStatus: status })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find forwarding records by device port
SmsForwardingSchema.statics.findByDevicePort = function(devicePort: string, limit: number = 50) {
  return this.find({ devicePort })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to find failed records that can be retried
SmsForwardingSchema.statics.findRetryable = function(limit: number = 50) {
  return this.find({
    forwardStatus: 'failed',
    retryCount: { $lt: 3 }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get forwarding statistics
SmsForwardingSchema.statics.getStats = function(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$forwardStatus',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$createdAt' }
      }
    }
  ]);
};

// Create and export the model (prevent overwrite error)
export const SmsForwarding = mongoose.models.SmsForwarding || model<ISmsForwarding>('SmsForwarding', SmsForwardingSchema);