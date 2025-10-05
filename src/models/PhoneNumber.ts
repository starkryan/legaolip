import { Schema, model, Document, Types, mongoose } from 'mongoose';

// Interface for PhoneNumber document
export interface IPhoneNumber extends Document {
  deviceId: Types.ObjectId;
  phoneNumber: string;
  slotIndex?: number;
  carrierName?: string;
  operatorName?: string;
  signalStatus?: string;
  createdAt: Date;
  updatedAt: Date;

  // Skyline-compatible fields
  iccid?: string;          // SIM card ID
  imsi?: string;           // International Mobile Subscriber Identity
  sn?: string;             // Serial number
  operator?: string;       // Operator details
  balance?: string;        // Account balance
  signal?: number;         // Signal strength (0-15)
  networkType?: number;    // 0=no signal, 2=2G, 4=4G
  portStatus?: number;     // 0=empty, 2=ready, 3=active
  imei?: string;           // International Mobile Equipment Identity
  active?: boolean;        // Port active status
  inserted?: boolean;      // SIM inserted status
  slotActive?: boolean;    // Slot active status
  led?: boolean;           // LED status
}

// PhoneNumber schema
const PhoneNumberSchema = new Schema<IPhoneNumber>({
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  slotIndex: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  carrierName: {
    type: String,
    trim: true,
    index: true
  },
  operatorName: {
    type: String,
    trim: true
  },
  signalStatus: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor', 'No Signal', 'Unknown'],
    index: true,
    set: function(val: string) {
      // Convert to proper case format
      if (val) {
        const formattedVal = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        return formattedVal;
      }
      return val;
    }
  },

  // Skyline-compatible fields
  iccid: {
    type: String,
    trim: true
  },
  imsi: {
    type: String,
    trim: true
  },
  sn: {
    type: String,
    trim: true
  },
  operator: {
    type: String,
    trim: true
  },
  balance: {
    type: String,
    default: '0.00',
    trim: true
  },
  signal: {
    type: Number,
    min: 0,
    max: 15,
    default: 0
  },
  networkType: {
    type: Number,
    default: 0,
    enum: [0, 2, 4] // 0=no signal, 2=2G, 4=4G
  },
  portStatus: {
    type: Number,
    default: 0,
    enum: [0, 2, 3] // 0=empty, 2=ready, 3=active
  },
  imei: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  inserted: {
    type: Boolean,
    default: true
  },
  slotActive: {
    type: Boolean,
    default: true
  },
  led: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'phone_numbers'
});

// Compound index for device and phone number uniqueness (not duplicate with field indexes)
PhoneNumberSchema.index({ deviceId: 1, slotIndex: 1 });

// Virtual for checking if port is ready/active
PhoneNumberSchema.virtual('isReady').get(function() {
  return this.portStatus === 2 || this.portStatus === 3;
});

PhoneNumberSchema.virtual('isActive').get(function() {
  return this.portStatus === 3;
});

// Pre-save middleware
PhoneNumberSchema.pre('save', function(next) {
  // Update portStatus based on signal status and other factors
  if (this.signalStatus) {
    switch (this.signalStatus) {
      case 'Excellent':
      case 'Good':
        this.networkType = 4; // 4G
        this.signal = this.signalStatus === 'Excellent' ? 15 : 12;
        break;
      case 'Fair':
        this.networkType = 2; // 2G
        this.signal = 8;
        break;
      case 'Poor':
        this.networkType = 2; // 2G
        this.signal = 4;
        break;
      case 'No Signal':
        this.networkType = 0; // No signal
        this.signal = 0;
        break;
    }
  }

  // Set portStatus based on active and inserted status
  if (this.active && this.inserted) {
    this.portStatus = 3; // Active
  } else if (this.inserted) {
    this.portStatus = 2; // Ready
  } else {
    this.portStatus = 0; // Empty
  }

  next();
});

// Static method to find phone numbers by device
PhoneNumberSchema.statics.findByDeviceId = function(deviceId: string | Types.ObjectId) {
  return this.find({ deviceId }).sort({ slotIndex: 1 });
};

// Static method to find phone numbers by carrier
PhoneNumberSchema.statics.findByCarrier = function(carrierName: string) {
  return this.find({ carrierName }).populate('deviceId');
};

// Create and export the model (prevent overwrite error)
export const PhoneNumber = mongoose.models.PhoneNumber || model<IPhoneNumber>('PhoneNumber', PhoneNumberSchema);