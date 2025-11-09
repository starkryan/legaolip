import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { IBankDetails } from './WithdrawalRequest';

// User account status
export enum UserAccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked'
}

// KYC status
export enum KYCStatus {
  NOT_VERIFIED = 'not_verified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

// Interface for UserAccount document
export interface IUserAccount extends Document {
  userId: string; // Device ID from Android app
  currentBalance: number; // Current balance in coins
  totalEarned: number; // Total coins earned
  totalWithdrawn: number; // Total coins withdrawn
  totalSpent: number; // Total coins spent on spins
  accountStatus: UserAccountStatus;
  kycStatus: KYCStatus;
  kycDocuments?: {
    aadhaarCard?: string; // URL to stored document
    panCard?: string; // URL to stored document
    bankStatement?: string; // URL to stored document
    submittedAt?: Date;
    verifiedAt?: Date;
    rejectedReason?: string;
  };
  savedBankDetails?: IBankDetails[]; // Multiple bank accounts
  preferences: {
    defaultBankIndex?: number;
    notifications: boolean;
    autoSaveBankDetails: boolean;
  };
  statistics: {
    totalSpins: number;
    totalWins: number;
    biggestWin: number;
    lastSpinAt?: Date;
    lastWithdrawalAt?: Date;
    withdrawalCount: number;
  };
  metadata: any; // Additional user data
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  balanceInRupees: number;
  totalEarnedInRupees: number;
  totalWithdrawnInRupees: number;
  winRate: number;
  isKYCVerified: boolean;
  canWithdraw: boolean;
  defaultBankDetails?: IBankDetails;
}

// Interface for UserAccount model with static methods
export interface IUserAccountModel extends mongoose.Model<IUserAccount> {
  getOrCreateUserAccount(userId: string): Promise<IUserAccount>;
  updateUserBalance(userId: string, amount: number, type?: 'credit' | 'debit'): Promise<IUserAccount | null>;
  addBankDetails(userId: string, bankDetails: Omit<IBankDetails, 'isDefault' | 'addedAt'>, isDefault?: boolean): Promise<IBankDetails>;
  getUserWithDetails(userId: string): Promise<IUserAccount | null>;
  getLeaderboard(limit?: number): Promise<any[]>;
}

// KYC Documents schema
const KYCDocumentsSchema = new Schema({
  aadhaarCard: { type: String }, // URL to stored document
  panCard: { type: String }, // URL to stored document
  bankStatement: { type: String }, // URL to stored document
  submittedAt: { type: Date },
  verifiedAt: { type: Date },
  rejectedReason: { type: String, trim: true, maxlength: 500 }
}, { _id: false });

// User preferences schema
const UserPreferencesSchema = new Schema({
  defaultBankIndex: { type: Number, min: 0 },
  notifications: { type: Boolean, default: true },
  autoSaveBankDetails: { type: Boolean, default: false }
}, { _id: false });

// User statistics schema
const UserStatisticsSchema = new Schema({
  totalSpins: { type: Number, default: 0, min: 0 },
  totalWins: { type: Number, default: 0, min: 0 },
  biggestWin: { type: Number, default: 0, min: 0 },
  lastSpinAt: { type: Date },
  lastWithdrawalAt: { type: Date },
  withdrawalCount: { type: Number, default: 0, min: 0 }
}, { _id: false });

// UserAccount schema
const UserAccountSchema = new Schema<IUserAccount>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    ref: 'Device'
  },
  currentBalance: {
    type: Number,
    required: true,
    default: 100, // Start with 100 coins
    min: 0,
    index: true
  },
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  accountStatus: {
    type: String,
    enum: Object.values(UserAccountStatus),
    default: UserAccountStatus.ACTIVE,
    index: true
  },
  kycStatus: {
    type: String,
    enum: Object.values(KYCStatus),
    default: KYCStatus.NOT_VERIFIED,
    index: true
  },
  kycDocuments: {
    type: KYCDocumentsSchema,
    default: {}
  },
  savedBankDetails: [{
    bankName: { type: String, required: true, trim: true, maxlength: 100 },
    accountHolderName: { type: String, required: true, trim: true, maxlength: 100 },
    accountNumber: { type: String, required: true, trim: true, maxlength: 50 },
    ifscCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 11 },
    upiId: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now }
  }],
  preferences: {
    type: UserPreferencesSchema,
    default: {}
  },
  statistics: {
    type: UserStatisticsSchema,
    default: {}
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'user_accounts',
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries (removed duplicates - these are already created by index: true in schema fields)
UserAccountSchema.index({ 'statistics.lastWithdrawalAt': 1 });

// Virtuals for formatted values
UserAccountSchema.virtual('balanceInRupees').get(function() {
  return this.currentBalance / 10;
});

UserAccountSchema.virtual('totalEarnedInRupees').get(function() {
  return this.totalEarned / 10;
});

UserAccountSchema.virtual('totalWithdrawnInRupees').get(function() {
  return this.totalWithdrawn / 10;
});

UserAccountSchema.virtual('winRate').get(function() {
  if (this.statistics.totalSpins === 0) return 0;
  return (this.statistics.totalWins / this.statistics.totalSpins) * 100;
});

UserAccountSchema.virtual('isKYCVerified').get(function() {
  return this.kycStatus === KYCStatus.VERIFIED;
});

UserAccountSchema.virtual('canWithdraw').get(function() {
  return this.accountStatus === UserAccountStatus.ACTIVE && 
         this.currentBalance >= 100 &&
         this.kycStatus === KYCStatus.VERIFIED;
});

UserAccountSchema.virtual('defaultBankDetails').get(function() {
  if (!this.savedBankDetails || this.savedBankDetails.length === 0) return null;
  
  const defaultIndex = this.preferences.defaultBankIndex || 0;
  if (defaultIndex < this.savedBankDetails.length) {
    return this.savedBankDetails[defaultIndex];
  }
  
  // Return first bank marked as default, or first bank
  return this.savedBankDetails.find(bank => bank.isDefault) || this.savedBankDetails[0];
});

// Pre-save middleware
UserAccountSchema.pre('save', function(next) {
  // Ensure balance doesn't go negative
  if (this.currentBalance < 0) {
    return next(new Error('Balance cannot be negative'));
  }
  
  // Update statistics when balance changes
  if (this.isModified('currentBalance')) {
    const originalBalance = this.getChanges().currentBalance?.[0] || this.currentBalance;
    const newBalance = this.currentBalance;
    
    if (newBalance > originalBalance) {
      this.totalEarned += (newBalance - originalBalance);
    } else if (newBalance < originalBalance) {
      this.totalSpent += (originalBalance - newBalance);
    }
  }
  
  next();
});

// Static method to get or create user account
UserAccountSchema.statics.getOrCreateUserAccount = async function(userId: string) {
  let userAccount = await this.findOne({ userId });
  
  if (!userAccount) {
    userAccount = await this.create({
      userId,
      currentBalance: 100, // Starting bonus
      totalEarned: 100,
      metadata: {
        registrationSource: 'android_app',
        registrationDate: new Date()
      }
    });
  }
  
  return userAccount;
};

// Static method to update user balance
UserAccountSchema.statics.updateUserBalance = async function(
  userId: string,
  amount: number,
  type: 'credit' | 'debit' = 'credit'
) {
  const updateData = type === 'credit' 
    ? { $inc: { currentBalance: amount } }
    : { $inc: { currentBalance: -amount } };
  
  return await this.findOneAndUpdate(
    { userId, accountStatus: UserAccountStatus.ACTIVE },
    updateData,
    { new: true, upsert: true }
  );
};

// Static method to add bank details
UserAccountSchema.statics.addBankDetails = async function(
  userId: string,
  bankDetails: Omit<IBankDetails, 'isDefault' | 'addedAt'>,
  isDefault: boolean = false
) {
  const userAccount = await this.findOne({ userId });
  if (!userAccount) {
    throw new Error('User account not found');
  }
  
  // If setting as default, unset previous default
  if (isDefault) {
    userAccount.savedBankDetails?.forEach((bank: any) => {
      bank.isDefault = false;
    });
  }
  
  const newBankDetails = {
    ...bankDetails,
    isDefault,
    addedAt: new Date()
  };
  
  userAccount.savedBankDetails.push(newBankDetails);
  await userAccount.save();
  
  return newBankDetails;
};

// Static method to get user with full details
UserAccountSchema.statics.getUserWithDetails = async function(userId: string) {
  return await this.findOne({ userId })
    .populate('userId', 'deviceId phoneNumber deviceBrandInfo')
    .lean();
};

// Static method to get leaderboard data
UserAccountSchema.statics.getLeaderboard = function(limit: number = 50) {
  return this.find({ accountStatus: UserAccountStatus.ACTIVE })
    .sort({ totalEarned: -1 })
    .limit(limit)
    .select('userId totalEarned statistics.totalWins statistics.biggestWin')
    .populate('userId', 'deviceId')
    .lean();
};

// Create and export the model
export const UserAccount = (mongoose.models.UserAccount as IUserAccountModel) || model<IUserAccount, IUserAccountModel>('UserAccount', UserAccountSchema);