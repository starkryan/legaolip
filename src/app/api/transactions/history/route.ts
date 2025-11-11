import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Transaction, TransactionType, UserAccount, WithdrawalRequest } from '@/models';

// GET /api/transactions/history - Get user's transaction history
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({
        success: false,
        error: 'deviceId is required'
      }, { status: 400 });
    }

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') as TransactionType;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    // Get user transactions
    const transactions = await Transaction.getUserTransactions(
      deviceId,
      limit,
      offset,
      type
    );

    // Get total count for pagination
    const query: any = { userId: deviceId };
    if (type) {
      query.type = type;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const total = await Transaction.countDocuments(query);

    // Get withdrawal requests for enhanced withdrawal transaction data
    const withdrawalRequests = await WithdrawalRequest.find({ userId: deviceId })
      .sort({ createdAt: -1 });

    // Create a map of withdrawal requests by ID for quick lookup
    const withdrawalMap = new Map();
    withdrawalRequests.forEach(withdrawal => {
      withdrawalMap.set(withdrawal._id.toString(), withdrawal);
      withdrawalMap.set(withdrawal._id, withdrawal); // Also handle ObjectId
    });

    // Get user statistics
    const userAccount = await UserAccount.findOne({ userId: deviceId });
    const transactionStats = await Transaction.getUserStats(deviceId);

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map(transaction => {
          let enhancedTransaction: any = {
            id: transaction._id,
            type: transaction.type,
            amount: transaction.amount,
            amountInRupees: transaction.amountInRupees,
            description: transaction.description,
            status: transaction.status,
            balanceBefore: transaction.balanceBefore,
            balanceAfter: transaction.balanceAfter,
            formattedBalanceBefore: transaction.formattedBalanceBefore,
            formattedBalanceAfter: transaction.formattedBalanceAfter,
            referenceId: transaction.referenceId,
            metadata: transaction.metadata,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
          };

          // Enhance withdrawal transactions with withdrawal-specific data
          if (transaction.type === 'withdrawal' && transaction.referenceId) {
            const withdrawal = withdrawalMap.get(transaction.referenceId.toString()) ||
                             withdrawalMap.get(transaction.referenceId);

            if (withdrawal) {
              enhancedTransaction = {
                ...enhancedTransaction,
                // Add withdrawal-specific fields
                formattedAmount: withdrawal.formattedAmount,
                bankDetails: {
                  lastDigits: withdrawal.bankDetails.accountNumber?.slice(-4) || null,
                  upiId: withdrawal.bankDetails.upiId,
                  bankName: withdrawal.bankDetails.bankName,
                  accountHolderName: withdrawal.bankDetails.accountHolderName,
                  withdrawalType: withdrawal.bankDetails.withdrawalType
                },
                transactionId: withdrawal.transactionId,
                referenceNumber: withdrawal.referenceNumber,
                rejectionReason: withdrawal.rejectionReason,
                processedAt: withdrawal.processedAt,
                processingTime: withdrawal.processingTime,
                notes: withdrawal.notes,
                // Add withdrawal request status for better consistency
                withdrawalStatus: withdrawal.status
              };
            }
          }

          return enhancedTransaction;
        }),
        statistics: {
          totalEarned: transactionStats.earning?.totalAmount || 0,
          totalWithdrawn: transactionStats.withdrawal?.totalAmount || 0,
          totalSpent: transactionStats.spin_cost?.totalAmount || 0,
          totalWins: transactionStats.spin_win?.totalAmount || 0,
          totalBonuses: transactionStats.bonus?.totalAmount || 0,
          earnedTransactions: transactionStats.earning?.count || 0,
          withdrawalTransactions: transactionStats.withdrawal?.count || 0,
          spinTransactions: transactionStats.spin_cost?.count || 0,
          winTransactions: transactionStats.spin_win?.count || 0,
          bonusTransactions: transactionStats.bonus?.count || 0,
          // Enhanced withdrawal statistics
          totalRequested: withdrawalRequests.reduce((sum, w) => sum + w.amount, 0),
          totalRupees: withdrawalRequests.reduce((sum, w) => sum + w.amountInRupees, 0),
          pendingCount: withdrawalRequests.filter(w => w.status === 'pending').length,
          approvedCount: withdrawalRequests.filter(w => w.status === 'approved').length,
          rejectedCount: withdrawalRequests.filter(w => w.status === 'rejected').length,
          processedCount: withdrawalRequests.filter(w => w.status === 'processed').length
        },
        userAccount: userAccount ? {
          currentBalance: userAccount.currentBalance,
          balanceInRupees: userAccount.balanceInRupees,
          totalEarned: userAccount.totalEarned,
          totalEarnedInRupees: userAccount.totalEarnedInRupees,
          totalWithdrawn: userAccount.totalWithdrawn,
          totalWithdrawnInRupees: userAccount.totalWithdrawnInRupees,
          totalSpent: userAccount.totalSpent,
          winRate: userAccount.winRate,
          statistics: userAccount.statistics,
          // Add saved bank details from withdrawal requests
          savedBankDetails: withdrawalRequests
            .filter(w => w.bankDetails)
            .map(w => ({
              bankName: w.bankDetails.bankName,
              accountHolderName: w.bankDetails.accountHolderName,
              lastDigits: w.bankDetails.accountNumber?.slice(-4) || null,
              upiId: w.bankDetails.upiId,
              withdrawalType: w.bankDetails.withdrawalType,
              isDefault: w.bankDetails.isDefault,
              addedAt: w.bankDetails.addedAt || w.createdAt
            }))
            .filter((details, index, arr) =>
              // Remove duplicates based on lastDigits or upiId
              arr.findIndex(d =>
                (d.lastDigits && details.lastDigits && d.lastDigits === details.lastDigits) ||
                (d.upiId && details.upiId && d.upiId === details.upiId)
              ) === index
            )
        } : null,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get transaction history error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}