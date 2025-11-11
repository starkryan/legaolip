import mongoose, { Schema, model, Document, Types } from 'mongoose';

// Withdrawal status
export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
  CANCELLED = 'cancelled'
}

// Bank details interface
export interface IBankDetails {
  bankName?: string; // Optional for UPI-only withdrawals
  accountHolderName?: string; // Optional for UPI-only withdrawals
  accountNumber?: string; // Optional for UPI-only withdrawals
  ifscCode?: string; // Optional for UPI-only withdrawals
  upiId: string; // Required UPI ID for UPI-only withdrawals
  isDefault?: boolean;
  addedAt?: Date;
  withdrawalType: 'bank' | 'upi'; // Track withdrawal type
}

// Interface for WithdrawalRequest document
export interface IWithdrawalRequest extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  userId: string; // Device ID from Android app
  amount: number; // Amount in coins
  amountInRupees: number; // Amount in rupees
  bankDetails: IBankDetails;
  status: WithdrawalStatus;
  transactionId?: string; // Transaction ID when processed
  referenceNumber?: string; // Bank reference number
  rejectionReason?: string;
  processedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  formattedAmount: string;
  isPending: boolean;
  isApproved: boolean;
  isProcessed: boolean;
  processingTime: number | null;
}

// Interface for WithdrawalRequest model with static methods
export interface IWithdrawalRequestModel extends mongoose.Model<IWithdrawalRequest> {
  updateWithdrawalStatus(withdrawalId: string, status: WithdrawalStatus, transactionId?: string, rejectionReason?: string): Promise<IWithdrawalRequest>;
  createWithdrawalRequest(userId: string, amount: number, bankDetails: IBankDetails, notes?: string): Promise<IWithdrawalRequest>;
  getUserWithdrawals(userId: string, limit?: number, offset?: number, status?: WithdrawalStatus): Promise<IWithdrawalRequest[]>;
  getUserWithdrawalStats(userId: string): Promise<any>;
  getWithdrawalStats(startDate?: Date, endDate?: Date): Promise<any>;
}

// Bank details schema
const BankDetailsSchema = new Schema<IBankDetails>({
  bankName: {
    type: String,
    required: false, // Optional for UPI-only withdrawals
    trim: true,
    maxlength: 100
  },
  accountHolderName: {
    type: String,
    required: false, // Optional for UPI-only withdrawals
    trim: true,
    maxlength: 100
  },
  accountNumber: {
    type: String,
    required: false, // Optional for UPI-only withdrawals
    trim: true,
    maxlength: 50
  },
  ifscCode: {
    type: String,
    required: false, // Optional for UPI-only withdrawals
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // IFSC is optional for UPI withdrawals
        // Basic IFSC code validation (11 characters, 4 letters + 7 digits)
        return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
      },
      message: 'Invalid IFSC code format'
    }
  },
  upiId: {
    type: String,
    required: true, // Required for UPI-only withdrawals
    trim: true,
    validate: {
      validator: function(v: string) {
        // Basic UPI ID validation
        return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(v);
      },
      message: 'Invalid UPI ID format'
    }
  },
  withdrawalType: {
    type: String,
    required: true,
    enum: ['bank', 'upi'],
    default: 'upi'
  }
}, { _id: false });

// WithdrawalRequest schema
const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>({
  userId: {
    type: String,
    required: true,
    index: true,
    ref: 'Device'
  },
  amount: {
    type: Number,
    required: true,
    min: 100, // Minimum withdrawal: 100 coins
    max: 10000 // Maximum withdrawal: 10000 coins
  },
  amountInRupees: {
    type: Number,
    required: false, // Will be auto-calculated in pre-save middleware
    min: 10, // Minimum: ₹10
    max: 1000 // Maximum: ₹1000
  },
  bankDetails: {
    type: BankDetailsSchema,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(WithdrawalStatus),
    default: WithdrawalStatus.PENDING,
    index: true
  },
  transactionId: {
    type: String,
    trim: true,
    index: true
  },
  referenceNumber: {
    type: String,
    trim: true,
    maxlength: 50
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  processedAt: {
    type: Date,
    index: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, {
  timestamps: true,
  collection: 'withdrawal_requests',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
WithdrawalRequestSchema.index({ userId: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ amount: 1, createdAt: -1 });

// Virtuals for formatted values
WithdrawalRequestSchema.virtual('formattedAmount').get(function() {
  return `${this.amount} coins (₹${this.amountInRupees})`;
});

WithdrawalRequestSchema.virtual('isPending').get(function() {
  return this.status === WithdrawalStatus.PENDING;
});

WithdrawalRequestSchema.virtual('isApproved').get(function() {
  return this.status === WithdrawalStatus.APPROVED;
});

WithdrawalRequestSchema.virtual('isProcessed').get(function() {
  return this.status === WithdrawalStatus.PROCESSED;
});

WithdrawalRequestSchema.virtual('processingTime').get(function() {
  if (this.processedAt && this.createdAt) {
    const diffMs = this.processedAt.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60)); // Hours
  }
  return null;
});

// Pre-save middleware for validation and auto-conversion
WithdrawalRequestSchema.pre('save', function(next) {
  // Auto-convert coins to rupees
  if (this.isModified('amount') && !this.isModified('amountInRupees')) {
    this.amountInRupees = Math.floor(this.amount / 10); // 10 coins = ₹1
  }
  
  // Validate amount conversion
  if (this.amount !== this.amountInRupees * 10) {
    return next(new Error('Amount conversion error: coins must be exactly 10x rupees'));
  }
  
  // Auto-set processedAt when status changes to PROCESSED
  if (this.isModified('status') && 
      this.status === WithdrawalStatus.PROCESSED && 
      !this.processedAt) {
    this.processedAt = new Date();
  }
  
  next();
});

// Static method to create withdrawal request
WithdrawalRequestSchema.statics.createWithdrawalRequest = async function(
  userId: string,
  amount: number,
  bankDetails: IBankDetails,
  notes?: string
) {
  const withdrawalRequest = new this({
    userId,
    amount,
    bankDetails,
    notes
  });
  
  return await withdrawalRequest.save();
};

// Static method to get user withdrawal requests
WithdrawalRequestSchema.statics.getUserWithdrawals = function(
  userId: string,
  limit: number = 50,
  offset: number = 0,
  status?: WithdrawalStatus
) {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to get withdrawal statistics
WithdrawalRequestSchema.statics.getUserWithdrawalStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$status',
        totalAmount: { $sum: '$amount' },
        totalRupees: { $sum: '$amountInRupees' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      totalAmount: stat.totalAmount,
      totalRupees: stat.totalRupees,
      count: stat.count
    };
    return acc;
  }, {});
};

// Static method to get pending withdrawals for admin
WithdrawalRequestSchema.statics.getPendingWithdrawals = function(limit: number = 100) {
  return this.find({ status: WithdrawalStatus.PENDING })
    .sort({ createdAt: 1 }) // Oldest first
    .limit(limit)
    .populate('userId', 'deviceId phoneNumber');
};

// Static method to update withdrawal status
WithdrawalRequestSchema.statics.updateWithdrawalStatus = async function(
  withdrawalId: string,
  status: WithdrawalStatus,
  transactionId?: string,
  referenceNumber?: string,
  rejectionReason?: string
) {
  const updateData: any = { status };
  
  if (transactionId) updateData.transactionId = transactionId;
  if (referenceNumber) updateData.referenceNumber = referenceNumber;
  if (rejectionReason) updateData.rejectionReason = rejectionReason;
  
  return await this.findByIdAndUpdate(
    withdrawalId,
    updateData,
    { new: true }
  );
};

// Create and export the model
export const WithdrawalRequest = (mongoose.models.WithdrawalRequest as IWithdrawalRequestModel) || model<IWithdrawalRequest, IWithdrawalRequestModel>('WithdrawalRequest', WithdrawalRequestSchema);