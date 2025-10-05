import { Schema, model, Document, mongoose } from 'mongoose';

// Interface for SMS Forwarding Configuration document
export interface ISmsForwardingConfig extends Document {
  name: string;                    // User-defined name for this forwarding rule
  url: string;                     // Webhook URL to forward SMS to
  isActive: boolean;               // Whether this forwarding rule is active
  deviceIds?: string[];            // Specific device IDs to forward from (empty = all devices)
  phoneNumbers?: string[];         // Specific phone numbers to forward (empty = all)
  headers?: Record<string, string>; // Custom headers for webhook requests
  retryCount: number;              // Number of retry attempts
  retryDelay: number;              // Delay between retries in seconds
  timeout: number;                 // Request timeout in seconds
  lastUsed?: Date;                // Last time this forwarding was used
  successCount: number;            // Total successful forwards
  failureCount: number;            // Total failed forwards
  createdAt: Date;
  updatedAt: Date;
}

// SMS Forwarding Configuration schema
const SmsForwardingConfigSchema = new Schema<ISmsForwardingConfig>({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Basic URL validation
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP or HTTPS URL'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  deviceIds: [{
    type: String,
    trim: true
  }],
  phoneNumbers: [{
    type: String,
    trim: true
  }],
  headers: {
    type: Map,
    of: String,
    default: new Map([
      ['Content-Type', 'application/json'],
      ['User-Agent', 'GOIP-SMS-Forwarder']
    ])
  },
  retryCount: {
    type: Number,
    default: 3,
    min: 0,
    max: 10
  },
  retryDelay: {
    type: Number,
    default: 5,
    min: 1,
    max: 300
  },
  timeout: {
    type: Number,
    default: 30,
    min: 5,
    max: 300
  },
  lastUsed: {
    type: Date,
    index: true
  },
  successCount: {
    type: Number,
    default: 0,
    min: 0
  },
  failureCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'sms_forwarding_configs'
});

// Indexes for better query performance
SmsForwardingConfigSchema.index({ isActive: 1, createdAt: -1 });
SmsForwardingConfigSchema.index({ lastUsed: -1 });

// Virtual for checking success rate
SmsForwardingConfigSchema.virtual('successRate').get(function() {
  const total = this.successCount + this.failureCount;
  return total > 0 ? (this.successCount / total) * 100 : 0;
});

// Virtual for checking if config is healthy (low failure rate)
SmsForwardingConfigSchema.virtual('isHealthy').get(function() {
  const total = this.successCount + this.failureCount;
  if (total < 10) return true; // Too few attempts to judge
  return this.failureCount / total < 0.2; // Less than 20% failure rate
});

// Static method to find active configurations
SmsForwardingConfigSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

// Static method to find configurations for specific device
SmsForwardingConfigSchema.statics.findByDevice = function(deviceId: string) {
  return this.find({
    isActive: true,
    $or: [
      { deviceIds: { $size: 0 } }, // Empty array means all devices
      { deviceIds: deviceId }
    ]
  }).sort({ createdAt: -1 });
};

// Static method to find configurations for specific phone number
SmsForwardingConfigSchema.statics.findByPhoneNumber = function(phoneNumber: string) {
  return this.find({
    isActive: true,
    $or: [
      { phoneNumbers: { $size: 0 } }, // Empty array means all phone numbers
      { phoneNumbers: phoneNumber }
    ]
  }).sort({ createdAt: -1 });
};

// Static method to get forwarding statistics
SmsForwardingConfigSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalConfigs: { $sum: 1 },
        activeConfigs: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalSuccesses: { $sum: '$successCount' },
        totalFailures: { $sum: '$failureCount' }
      }
    }
  ]);
};

// Pre-save middleware to validate URLs
SmsForwardingConfigSchema.pre('save', function(next) {
  if (this.isModified('url')) {
    // Ensure URL has proper format
    if (!this.url.startsWith('http://') && !this.url.startsWith('https://')) {
      this.url = 'https://' + this.url;
    }
  }
  next();
});

// Create and export the model
export const SmsForwardingConfig = mongoose.models.SmsForwardingConfig ||
  model<ISmsForwardingConfig>('SmsForwardingConfig', SmsForwardingConfigSchema);