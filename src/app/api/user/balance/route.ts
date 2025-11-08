import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserAccount, Transaction, TransactionType } from '@/models';

// GET /api/user/balance - Get user balance and account details
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

    // Get or create user account
    const userAccount = await UserAccount.getOrCreateUserAccount(deviceId);

    // Get recent transactions for context
    const recentTransactions = await Transaction.getUserTransactions(deviceId, 5, 0);

    // Get transaction statistics
    const transactionStats = await Transaction.getUserStats(deviceId);

    // Check for pending withdrawal
    const { WithdrawalRequest } = await import('@/models');
    const pendingWithdrawal = await WithdrawalRequest.findOne({
      userId: deviceId,
      status: 'pending'
    });

    return NextResponse.json({
      success: true,
      data: {
        balance: {
          currentBalance: userAccount.currentBalance,
          balanceInRupees: userAccount.balanceInRupees,
          formatted: `${userAccount.currentBalance} coins (₹${userAccount.balanceInRupees})`
        },
        statistics: {
          totalEarned: userAccount.totalEarned,
          totalEarnedInRupees: userAccount.totalEarnedInRupees,
          totalWithdrawn: userAccount.totalWithdrawn,
          totalWithdrawnInRupees: userAccount.totalWithdrawnInRupees,
          totalSpent: userAccount.totalSpent,
          winRate: userAccount.winRate,
          totalSpins: userAccount.statistics.totalSpins,
          totalWins: userAccount.statistics.totalWins,
          biggestWin: userAccount.statistics.biggestWin,
          withdrawalCount: userAccount.statistics.withdrawalCount
        },
        accountStatus: {
          status: userAccount.accountStatus,
          kycStatus: userAccount.kycStatus,
          canWithdraw: userAccount.canWithdraw,
          isKYCVerified: userAccount.isKYCVerified
        },
        transactions: {
          recent: recentTransactions.map(t => ({
            id: t._id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            createdAt: t.createdAt
          })),
          statistics: {
            earned: transactionStats.earning?.totalAmount || 0,
            spent: transactionStats.spin_cost?.totalAmount || 0,
            withdrawn: transactionStats.withdrawal?.totalAmount || 0,
            won: transactionStats.spin_win?.totalAmount || 0
          }
        },
        withdrawalStatus: {
          hasPendingWithdrawal: !!pendingWithdrawal,
          pendingWithdrawal: pendingWithdrawal ? {
            id: pendingWithdrawal._id,
            amount: pendingWithdrawal.amount,
            amountInRupees: pendingWithdrawal.amountInRupees,
            status: pendingWithdrawal.status,
            createdAt: pendingWithdrawal.createdAt
          } : null
        },
        bankDetails: userAccount.defaultBankDetails ? {
          bankName: userAccount.defaultBankDetails.bankName,
          accountHolderName: userAccount.defaultBankDetails.accountHolderName,
          lastDigits: userAccount.defaultBankDetails.accountNumber.slice(-4),
          upiId: userAccount.defaultBankDetails.upiId
        } : null,
        preferences: userAccount.preferences
      }
    });

  } catch (error) {
    console.error('Get user balance error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/user/balance - Update user balance (for admin use or game events)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { deviceId, amount, type, description, metadata } = body;

    if (!deviceId || !amount || !type || !description) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: deviceId, amount, type, description'
      }, { status: 400 });
    }

    // Validate amount
    const transactionAmount = parseInt(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount'
      }, { status: 400 });
    }

    // Validate transaction type
    if (!Object.values(TransactionType).includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid transaction type'
      }, { status: 400 });
    }

    // Get user account
    const userAccount = await UserAccount.getOrCreateUserAccount(deviceId);

    // Check if user has sufficient balance for debit transactions
    if ((type === TransactionType.WITHDRAWAL || type === TransactionType.SPIN_COST) && 
        userAccount.currentBalance < transactionAmount) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance',
        currentBalance: userAccount.currentBalance,
        requiredAmount: transactionAmount
      }, { status: 400 });
    }

    // Create transaction
    const balanceBefore = userAccount.currentBalance;
    const balanceAfter = type === TransactionType.WITHDRAWAL || type === TransactionType.SPIN_COST
      ? balanceBefore - transactionAmount
      : balanceBefore + transactionAmount;

    const transaction = await Transaction.createTransaction({
      userId: deviceId,
      type,
      amount: transactionAmount,
      description,
      status: 'completed',
      balanceBefore,
      balanceAfter,
      metadata: metadata || {}
    });

    // Update user balance
    await UserAccount.updateUserBalance(deviceId, transactionAmount, 
      type === TransactionType.WITHDRAWAL || type === TransactionType.SPIN_COST ? 'debit' : 'credit'
    );

    // Update user statistics for specific transaction types
    if (type === TransactionType.SPIN_WIN) {
      userAccount.statistics.totalWins += 1;
      if (transactionAmount > userAccount.statistics.biggestWin) {
        userAccount.statistics.biggestWin = transactionAmount;
      }
      userAccount.statistics.lastSpinAt = new Date();
    } else if (type === TransactionType.SPIN_COST) {
      userAccount.statistics.totalSpins += 1;
      userAccount.statistics.lastSpinAt = new Date();
    }

    await userAccount.save();

    return NextResponse.json({
      success: true,
      data: {
        transaction: {
          id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          balanceBefore,
          balanceAfter,
          createdAt: transaction.createdAt
        },
        newBalance: balanceAfter,
        previousBalance: balanceBefore
      },
      message: 'Balance updated successfully'
    });

  } catch (error) {
    console.error('Update user balance error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}