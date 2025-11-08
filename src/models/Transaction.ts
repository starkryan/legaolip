import mongoose, { Schema, model, Document, Types } from 'mongoose';

// Transaction types
export enum TransactionType {
  EARNING = 'earning',
  WITHDRAWAL = 'withdrawal',
  SPIN_COST = 'spin_cost',
  SPIN_WIN = 'spin_win',
  BONUS = 'bonus',
  REFUND = 'refund'
}

// Transaction status
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Interface for Transaction document
export interface ITransaction extends Document {
  userId: string; // Device ID from Android app
  type: TransactionType;
  amount: number; // Amount in coins
  description: string;
  status: TransactionStatus;
  balanceBefore: number; // Balance before transaction
  balanceAfter: number; // Balance after transaction
  referenceId?: string; // Reference to related transaction (e.g., withdrawal request)
  metadata?: any; // Additional transaction data
  createdAt: Date;
  updatedAt: Date;
}

// Transaction schema
const TransactionSchema = new Schema<ITransaction>({
  userId: {
    type: String,
    required: true,
    index: true,
    ref: 'Device'
  },
  type: {
    type: String,
    enum: Object.values(TransactionType),
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.COMPLETED,
    index: true
  },
  balanceBefore: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  referenceId: {
    type: String,
    trim: true,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'transactions',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });

// Virtual for formatted amount
TransactionSchema.virtual('amountInRupees').get(function() {
  return this.amount / 10; // 10 coins = ₹1
});

// Virtual for formatted balance
TransactionSchema.virtual('formattedBalanceBefore').get(function() {
  return `${this.balanceBefore} coins (₹${this.balanceBefore / 10})`;
});

TransactionSchema.virtual('formattedBalanceAfter').get(function() {
  return `${this.balanceAfter} coins (₹${this.balanceAfter / 10})`;
});

// Pre-save middleware for validation
TransactionSchema.pre('save', function(next) {
  // Ensure balanceAfter is correct based on balanceBefore and amount
  if (this.isNew || this.isModified('amount') || this.isModified('balanceBefore')) {
    if (this.type === TransactionType.WITHDRAWAL || this.type === TransactionType.SPIN_COST) {
      this.balanceAfter = this.balanceBefore - this.amount;
    } else if (this.type === TransactionType.EARNING || this.type === TransactionType.SPIN_WIN || this.type === TransactionType.BONUS) {
      this.balanceAfter = this.balanceBefore + this.amount;
    }
    
    // Ensure balance doesn't go negative
    if (this.balanceAfter < 0) {
      return next(new Error('Insufficient balance for this transaction'));
    }
  }
  
  next();
});

// Static method to create a transaction
TransactionSchema.statics.createTransaction = async function(transactionData: Partial<ITransaction>) {
  const transaction = new this(transactionData);
  return await transaction.save();
};

// Static method to get user balance
TransactionSchema.statics.getUserBalance = async function(userId: string) {
  const latestTransaction = await this.findOne({ userId })
    .sort({ createdAt: -1 })
    .select('balanceAfter');
  
  return latestTransaction ? latestTransaction.balanceAfter : 100; // Default balance
};

// Static method to get user transactions
TransactionSchema.statics.getUserTransactions = function(
  userId: string, 
  limit: number = 50,
  offset: number = 0,
  type?: TransactionType
) {
  const query: any = { userId };
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to get transaction statistics
TransactionSchema.statics.getUserStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      totalAmount: stat.totalAmount,
      count: stat.count
    };
    return acc;
  }, {});
};

// Create and export the model
export const Transaction = mongoose.models.Transaction || model<ITransaction>('Transaction', TransactionSchema);