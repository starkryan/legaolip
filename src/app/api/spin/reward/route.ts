import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserAccount, Transaction, TransactionType, TransactionStatus } from '@/models';

// Game configuration
const SPIN_COST = 10; // Cost per spin in coins
const WIN_MULTIPLIERS = [0, 0.5, 1, 2, 5, 10]; // Multipliers for different rewards
const PROBABILITY_DISTRIBUTION = [0.4, 0.25, 0.2, 0.1, 0.04, 0.01]; // Probability for each multiplier

// POST /api/spin/reward - Process a spin game with cost deduction and potential win
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { deviceId, action, spinResult, betAmount } = body;

    if (!deviceId) {
      return NextResponse.json({
        success: false,
        error: 'Device ID is required'
      }, { status: 400 });
    }

    if (!action || !['play', 'result'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "play" or "result"'
      }, { status: 400 });
    }

    // Get or create user account
    const userAccount = await UserAccount.getOrCreateUserAccount(deviceId);

    // Check account status
    if (userAccount.accountStatus !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Account is not active',
        accountStatus: userAccount.accountStatus
      }, { status: 403 });
    }

    const actualBetAmount = betAmount || SPIN_COST;

    if (action === 'play') {
      // Step 1: Deduct spin cost
      if (userAccount.currentBalance < actualBetAmount) {
        return NextResponse.json({
          success: false,
          error: 'Insufficient balance for spin',
          currentBalance: userAccount.currentBalance,
          requiredAmount: actualBetAmount
        }, { status: 400 });
      }

      // Create transaction for spin cost
      const balanceBefore = userAccount.currentBalance;
      const balanceAfter = balanceBefore - actualBetAmount;

      const costTransaction = await Transaction.createTransaction({
        userId: deviceId,
        type: TransactionType.SPIN_COST,
        amount: actualBetAmount,
        description: `Spin game cost: ${actualBetAmount} coins`,
        status: TransactionStatus.COMPLETED,
        balanceBefore,
        balanceAfter,
        metadata: {
          gameType: 'spin',
          betAmount: actualBetAmount,
          apiEndpoint: '/api/spin/reward'
        }
      });

      // Update user balance (deduct spin cost)
      await UserAccount.updateUserBalance(deviceId, actualBetAmount, 'debit');

      // Update user statistics
      userAccount.statistics.totalSpins = (userAccount.statistics.totalSpins || 0) + 1;
      userAccount.statistics.lastSpinAt = new Date();
      await userAccount.save();

      // Generate spin result (random win multiplier)
      const random = Math.random();
      let cumulativeProbability = 0;
      let winMultiplier = 0;
      let winIndex = 0;

      for (let i = 0; i < PROBABILITY_DISTRIBUTION.length; i++) {
        cumulativeProbability += PROBABILITY_DISTRIBUTION[i];
        if (random < cumulativeProbability) {
          winMultiplier = WIN_MULTIPLIERS[i];
          winIndex = i;
          break;
        }
      }

      const winAmount = Math.floor(actualBetAmount * winMultiplier);

      return NextResponse.json({
        success: true,
        data: {
          action: 'spin_cost_deducted',
          spinResult: {
            multiplier: winMultiplier,
            winAmount,
            winIndex,
            betAmount: actualBetAmount
          },
          transactions: {
            costTransaction: {
              id: costTransaction._id,
              amount: actualBetAmount,
              balanceBefore,
              balanceAfter
            }
          },
          newBalance: balanceAfter,
          nextAction: winAmount > 0 ? 'claim_win' : 'game_over',
          message: winAmount > 0 
            ? `Congratulations! You won ${winAmount} coins (${winMultiplier}x multiplier)` 
            : `Spin cost deducted. Better luck next time!`
        }
      });

    } else if (action === 'result') {
      // Step 2: Process win claim (if spinResult is provided)
      if (!spinResult) {
        return NextResponse.json({
          success: false,
          error: 'Spin result is required for result action'
        }, { status: 400 });
      }

      const { multiplier, winAmount, winIndex, betAmount } = spinResult;

      // Validate spin result
      if (typeof multiplier !== 'number' || typeof winAmount !== 'number') {
        return NextResponse.json({
          success: false,
          error: 'Invalid spin result format'
        }, { status: 400 });
      }

      if (winAmount <= 0) {
        return NextResponse.json({
          success: false,
          error: 'No win amount to claim'
        }, { status: 400 });
      }

      // Double-check win calculation matches server calculation
      const expectedWinAmount = Math.floor((betAmount || SPIN_COST) * multiplier);
      if (winAmount !== expectedWinAmount) {
        return NextResponse.json({
          success: false,
          error: 'Win amount validation failed',
          expected: expectedWinAmount,
          received: winAmount
        }, { status: 400 });
      }

      // Create transaction for spin win
      const balanceBefore = userAccount.currentBalance;
      const balanceAfter = balanceBefore + winAmount;

      const winTransaction = await Transaction.createTransaction({
        userId: deviceId,
        type: TransactionType.SPIN_WIN,
        amount: winAmount,
        description: `Spin game win: ${winAmount} coins (${multiplier}x multiplier)`,
        status: TransactionStatus.COMPLETED,
        balanceBefore,
        balanceAfter,
        metadata: {
          gameType: 'spin',
          betAmount: betAmount || SPIN_COST,
          multiplier,
          winIndex,
          winAmount,
          apiEndpoint: '/api/spin/reward'
        }
      });

      // Update user balance (add win amount)
      await UserAccount.updateUserBalance(deviceId, winAmount, 'credit');

      // Update user statistics
      if (winAmount > userAccount.statistics.biggestWin) {
        userAccount.statistics.biggestWin = winAmount;
      }
      await userAccount.save();

      return NextResponse.json({
        success: true,
        data: {
          action: 'win_claimed',
          spinResult: {
            multiplier,
            winAmount,
            winIndex,
            betAmount: betAmount || SPIN_COST
          },
          transactions: {
            winTransaction: {
              id: winTransaction._id,
              amount: winAmount,
              balanceBefore,
              balanceAfter
            }
          },
          newBalance: balanceAfter,
          totalBalanceChange: winAmount - (betAmount || SPIN_COST),
          message: `Congratulations! ${winAmount} coins added to your balance`
        }
      });
    }

  } catch (error) {
    console.error('Spin reward error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/spin/reward - Get spin history and game statistics
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

    // Get user account
    const userAccount = await UserAccount.getOrCreateUserAccount(deviceId);

    // Get user's spin transactions (both costs and wins)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const spinTransactions = await Transaction.find({
      userId: deviceId,
      type: { $in: [TransactionType.SPIN_COST, TransactionType.SPIN_WIN] }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .lean();

    const totalSpinTransactions = await Transaction.countDocuments({
      userId: deviceId,
      type: { $in: [TransactionType.SPIN_COST, TransactionType.SPIN_WIN] }
    });

    // Calculate spin statistics
    const spinStats = {
      totalSpins: userAccount.statistics.totalSpins || 0,
      totalSpent: spinTransactions
        .filter((t: any) => t.type === TransactionType.SPIN_COST)
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      totalWon: spinTransactions
        .filter((t: any) => t.type === TransactionType.SPIN_WIN)
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      biggestWin: userAccount.statistics.biggestWin || 0,
      netProfit: 0,
      averageWin: 0,
      winRate: 0
    };

    // Calculate additional statistics
    const winTransactions = spinTransactions.filter((t: any) => t.type === TransactionType.SPIN_WIN);
    const totalWins = winTransactions.length;

    if (totalWins > 0) {
      spinStats.averageWin = Math.round(spinStats.totalWon / totalWins);
      spinStats.winRate = Math.round((totalWins / spinStats.totalSpins) * 100);
    }

    spinStats.netProfit = spinStats.totalWon - spinStats.totalSpent;

    // Format transactions for response
    const formattedTransactions = spinTransactions.map((transaction: any) => ({
      id: transaction._id.toString(),
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      balanceChange: transaction.type === TransactionType.SPIN_COST 
        ? -transaction.amount 
        : transaction.amount,
      createdAt: transaction.createdAt,
      metadata: transaction.metadata
    }));

    // Game configuration
    const gameConfig = {
      spinCost: SPIN_COST,
      winMultipliers: WIN_MULTIPLIERS,
      probabilityDistribution: PROBABILITY_DISTRIBUTION,
      maximumWin: Math.floor(SPIN_COST * Math.max(...WIN_MULTIPLIERS))
    };

    return NextResponse.json({
      success: true,
      data: {
        user: {
          deviceId,
          currentBalance: userAccount.currentBalance,
          accountStatus: userAccount.accountStatus,
          statistics: userAccount.statistics
        },
        spinStats,
        recentTransactions: formattedTransactions,
        gameConfig,
        pagination: {
          page,
          limit,
          total: totalSpinTransactions,
          pages: Math.ceil(totalSpinTransactions / limit),
          hasNext: page * limit < totalSpinTransactions,
          hasPrev: page > 1
        }
      },
      message: `Found ${formattedTransactions.length} spin transactions`
    });

  } catch (error) {
    console.error('Get spin history error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}