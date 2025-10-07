import mongoose, { Schema, model, Document, Types,  } from 'mongoose';

// Interface for SmsMessage document
export interface ISmsMessage extends Document {
  deviceId: Types.ObjectId;
  sender?: string;
  recipient?: string;
  message: string;
  timestamp?: Date;
  receivedAt?: Date;
  sentAt?: Date;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
  slotIndex?: number;
}

// SmsMessage schema
const SmsMessageSchema = new Schema<ISmsMessage>({
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  sender: {
    type: String,
    trim: true,
    index: true
  },
  recipient: {
    type: String,
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
    index: true
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  sentAt: {
    type: Date,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending',
    index: true
  },
  slotIndex: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  }
}, {
  timestamps: true,
  collection: 'sms_messages'
});

// Compound indexes for common queries (not duplicate with field indexes)
SmsMessageSchema.index({ deviceId: 1, receivedAt: -1 });
SmsMessageSchema.index({ sender: 1, receivedAt: -1 });
SmsMessageSchema.index({ recipient: 1, receivedAt: -1 });

// Virtual for checking if message is received or sent
SmsMessageSchema.virtual('isReceived').get(function() {
  return !!this.receivedAt && !this.sentAt;
});

SmsMessageSchema.virtual('isSent').get(function() {
  return !!this.sentAt;
});

// Pre-save middleware
SmsMessageSchema.pre('save', function(next) {
  // Set default timestamp if not provided
  if (!this.timestamp) {
    this.timestamp = this.receivedAt || this.sentAt || new Date();
  }

  // Set status based on dates
  if (this.sentAt) {
    this.status = this.status === 'pending' ? 'sent' : this.status;
  }

  next();
});

// Static method to find messages by device
SmsMessageSchema.statics.findByDeviceId = function(deviceId: string | Types.ObjectId, limit: number = 100) {
  return this.find({ deviceId })
    .sort({ receivedAt: -1 })
    .limit(limit)
    .populate('deviceId');
};

// Static method to find messages by sender
SmsMessageSchema.statics.findBySender = function(sender: string, limit: number = 50) {
  return this.find({ sender })
    .sort({ receivedAt: -1 })
    .limit(limit)
    .populate('deviceId');
};

// Static method to find messages by recipient
SmsMessageSchema.statics.findByRecipient = function(recipient: string, limit: number = 50) {
  return this.find({ recipient })
    .sort({ receivedAt: -1 })
    .limit(limit)
    .populate('deviceId');
};

// Static method to find recent messages
SmsMessageSchema.statics.findRecent = function(hours: number = 24, limit: number = 100) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ receivedAt: { $gte: since } })
    .sort({ receivedAt: -1 })
    .limit(limit)
    .populate('deviceId');
};

// Create and export the model (prevent overwrite error)
export const SmsMessage = mongoose.models.SmsMessage || model<ISmsMessage>('SmsMessage', SmsMessageSchema);