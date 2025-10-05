import mongoose, { Schema, model, Document } from 'mongoose';

// Interface for Device document
export interface IDevice extends Document {
  deviceId: string;
  phoneNumber?: string;
  simSlots?: any; // JSON field for SIM slot information
  batteryLevel?: number;
  deviceStatus: string;
  lastSeen: Date;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Skyline-compatible fields
  macAddress?: string;
  ipAddress?: string;
  version?: string;
  maxPorts?: number;
  maxSlots?: number;
  seqNumber?: number;
  expires?: number;
}

// Device schema
const DeviceSchema = new Schema<IDevice>({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  simSlots: {
    type: Schema.Types.Mixed,
    default: []
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  deviceStatus: {
    type: String,
    enum: ['online', 'offline', 'maintenance'],
    default: 'offline',
    index: true
  },
  lastSeen: {
    type: Date,
    required: true,
    index: true
  },
  registeredAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Skyline-compatible fields
  macAddress: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  version: {
    type: String,
    trim: true
  },
  maxPorts: {
    type: Number,
    default: 32
  },
  maxSlots: {
    type: Number,
    default: 16
  },
  seqNumber: {
    type: Number,
    default: 102
  },
  expires: {
    type: Number,
    default: -1
  }
}, {
  timestamps: true,
  collection: 'devices',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Additional indexes for better query performance
DeviceSchema.index({ lastSeen: -1 });
DeviceSchema.index({ registeredAt: -1 });

// Virtual for checking if device is online
DeviceSchema.virtual('isOnline').get(function() {
  return this.deviceStatus === 'online';
});

// Virtual for populating phone numbers
DeviceSchema.virtual('phoneNumbers', {
  ref: 'PhoneNumber',
  localField: '_id',
  foreignField: 'deviceId'
});

// Static method to find devices with phone numbers
DeviceSchema.statics.findWithPhoneNumbers = function() {
  return this.find({}).populate('phoneNumbers');
};

// Static method to mark offline devices
DeviceSchema.statics.markOfflineDevices = function(thresholdMinutes: number = 5) {
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
  return this.updateMany(
    {
      deviceStatus: 'online',
      lastSeen: { $lt: threshold }
    },
    { deviceStatus: 'offline' }
  );
};

// Pre-save middleware
DeviceSchema.pre('save', function(next) {
  if (this.isModified('lastSeen') && this.lastSeen) {
    // If lastSeen is updated to recent time, mark as online
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (this.lastSeen > fiveMinutesAgo) {
      this.deviceStatus = 'online';
    }
  }
  next();
});

// Create and export the model (prevent overwrite error)
export const Device = mongoose.models.Device || model<IDevice>('Device', DeviceSchema);