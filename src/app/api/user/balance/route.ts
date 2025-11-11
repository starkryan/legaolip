import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserAccount } from '@/models';
import { Transaction, TransactionType, TransactionStatus } from '@/models';

// GET /api/user/balance - Get user's real-time balance
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({
        success: false,
        error: 'Device ID is required'
      }, { status: 400 });
    }

    // Get or create user account
    const userAccount = await UserAccount.getOrCreateUserAccount(deviceId);

    // Get recent transactions
    const recentTransactions = await Transaction.getUserTransactions(
      deviceId,
      10 // Last 10 transactions
    );

    // Get transaction statistics
    const transactionStats = await Transaction.getUserStats(deviceId);

    // Calculate recent transaction statistics
    const recentStats = {
      earned: 0,
      spent: 0,
      withdrawn: 0,
      won: 0
    };

    recentTransactions.forEach(tx => {
      if (tx.type === TransactionType.EARNING || tx.type === TransactionType.SPIN_WIN || tx.type === TransactionType.BONUS) {
        recentStats.earned += tx.amount;
      }
      if (tx.type === TransactionType.SPIN_COST) {
        recentStats.spent += tx.amount;
      }
      if (tx.type === TransactionType.WITHDRAWAL) {
        recentStats.withdrawn += tx.amount;
      }
      if (tx.type === TransactionType.SPIN_WIN) {
        recentStats.won += tx.amount;
      }
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
          totalWins: userAccount.statistics.totalWins,
          totalSpins: userAccount.statistics.totalSpins,
          winRate: userAccount.winRate,
          biggestWin: userAccount.statistics.biggestWin
        },
        accountStatus: {
          status: userAccount.accountStatus,
          canWithdraw: userAccount.canWithdraw
        },
        transactions: {
          recent: recentTransactions.map((tx: any) => ({
            id: (tx._id as any).toString(),
            type: tx.type,
            amount: tx.amount,
            amountInRupees: tx.amountInRupees,
            description: tx.description,
            createdAt: tx.createdAt
          })),
          statistics: recentStats
        },
        withdrawalStatus: {
          hasPendingWithdrawal: false,
          pendingWithdrawal: null
        },
        bankDetails: null,
        preferences: {
          defaultBankIndex: null,
          notifications: true,
          autoSaveBankDetails: true
        }
      },
      message: 'Balance retrieved successfully'
    });

  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/user/balance - Update user balance (for rewards, penalties, etc.)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { deviceId, amount, type, description, metadata } = body;

    // Validate required fields
    if (!deviceId || amount === undefined || !type || !description) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: deviceId, amount, type, description'
      }, { status: 400 });
    }

    // Get user account
    const userAccount = await UserAccount.findOne({ userId: deviceId });
    if (!userAccount) {
      return NextResponse.json({
        success: false,
        error: 'User account not found'
      }, { status: 404 });
    }

    // Get current balance from transactions (more reliable than UserAccount balance)
    const currentBalance = await Transaction.getUserBalance(deviceId);

    // Calculate updated balance
    const updatedBalance = (type === 'spin_win' || type === 'earning' || type === 'bonus')
      ? currentBalance + amount
      : currentBalance - amount;

    // Validate balance for debit operations
    if ((type === 'withdrawal' || type === 'spin_cost') && currentBalance < amount) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance',
        currentBalance,
        requestedAmount: amount
      }, { status: 400 });
    }

    // Create transaction record
    const transaction = await Transaction.createTransaction({
      userId: deviceId,
      type: type === 'spin_win' ? TransactionType.SPIN_WIN :
            type === 'spin_cost' ? TransactionType.SPIN_COST :
            type === 'withdrawal' ? TransactionType.WITHDRAWAL :
            type === 'earning' ? TransactionType.EARNING :
            type === 'bonus' ? TransactionType.BONUS :
            TransactionType.EARNING, // default to earning
      amount,
      description,
      balanceBefore: currentBalance,
      balanceAfter: updatedBalance,
      status: TransactionStatus.COMPLETED,
      metadata: metadata || {}
    });

    // Update UserAccount balance (keep in sync)
    if (type === 'spin_win' || type === 'earning' || type === 'bonus') {
      await UserAccount.updateUserBalance(deviceId, amount, 'credit');
    } else if (type === 'spin_cost' || type === 'withdrawal') {
      await UserAccount.updateUserBalance(deviceId, amount, 'debit');
    }

    // Update user statistics if this is a spin-related transaction
    if (type === 'spin_cost' || type === 'spin_win') {
      await UserAccount.updateOne(
        { userId: deviceId },
        {
          $inc: {
            'statistics.totalSpins': 1
          },
          ...(type === 'spin_win' && {
            $inc: {
              'statistics.totalWins': 1,
              'statistics.biggestWin': Math.max(0, amount - (userAccount.statistics.biggestWin || 0))
            }
          }),
          'statistics.lastSpinAt': new Date()
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        transaction: {
          id: (transaction._id as any).toString(),
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          balanceBefore: transaction.balanceBefore,
          balanceAfter: transaction.balanceAfter
        },
        newBalance: updatedBalance,
        previousBalance: currentBalance,
        userStats: {
          totalSpins: userAccount.statistics.totalSpins + (type === 'spin_cost' ? 1 : 0),
          totalWins: userAccount.statistics.totalWins + (type === 'spin_win' ? 1 : 0),
          currentBalance: updatedBalance
        }
      },
      message: 'Balance updated successfully'
    });

  } catch (error) {
    console.error('Update balance error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}