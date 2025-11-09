import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserAccount, WithdrawalRequest, Transaction, TransactionType, TransactionStatus, WithdrawalStatus } from '@/models';

// GET /api/test/withdrawal-test - Test withdrawal system functionality
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId') || 'test-device-001';
    const action = searchParams.get('action') || 'status';

    switch (action) {
      case 'create-account':
        // Test user account creation
        const userAccount = await UserAccount.getOrCreateUserAccount(deviceId);
        return NextResponse.json({
          success: true,
          action: 'create-account',
          data: {
            userId: userAccount.userId,
            currentBalance: userAccount.currentBalance,
            balanceInRupees: userAccount.balanceInRupees,
            accountStatus: userAccount.accountStatus,
            kycStatus: userAccount.kycStatus
          },
          message: 'Test user account created/retrieved successfully'
        });

      case 'check-balance':
        // Test balance check
        const balance = await Transaction.getUserBalance(deviceId);
        return NextResponse.json({
          success: true,
          action: 'check-balance',
          data: {
            deviceId,
            currentBalance: balance,
            balanceInRupees: balance / 10
          },
          message: 'Balance check successful'
        });

      case 'add-coins':
        // Test adding coins to user balance
        const amount = parseInt(searchParams.get('amount') || '50');
        const transaction = await Transaction.createTransaction({
          userId: deviceId,
          type: TransactionType.SPIN_WIN,
          amount: amount,
          description: `Test spin win: ${amount} coins`,
          status: TransactionStatus.COMPLETED,
          balanceBefore: 100, // This would be fetched from user account in real scenario
          balanceAfter: 100 + amount,
          metadata: {
            testMode: true,
            timestamp: new Date().toISOString()
          }
        });

        // Update user balance
        await UserAccount.updateUserBalance(deviceId, amount, 'credit');

        return NextResponse.json({
          success: true,
          action: 'add-coins',
          data: {
            transactionId: transaction._id,
            amount: amount,
            newBalance: 100 + amount,
            description: transaction.description
          },
          message: `Added ${amount} coins to test account`
        });

      case 'withdrawal-history':
        // Test withdrawal history retrieval
        const withdrawalRequests = await WithdrawalRequest.getUserWithdrawals(deviceId, 10, 0);
        return NextResponse.json({
          success: true,
          action: 'withdrawal-history',
          data: {
            deviceId,
            withdrawalRequests: withdrawalRequests.map(req => ({
              id: req._id,
              amount: req.amount,
              amountInRupees: req.amountInRupees,
              status: req.status,
              formattedAmount: req.formattedAmount,
              createdAt: req.createdAt,
              processedAt: req.processedAt
            })),
            count: withdrawalRequests.length
          },
          message: 'Withdrawal history retrieved successfully'
        });

      case 'transaction-history':
        // Test transaction history retrieval
        const transactions = await Transaction.getUserTransactions(deviceId, 20, 0);
        return NextResponse.json({
          success: true,
          action: 'transaction-history',
          data: {
            deviceId,
            transactions: transactions.map(tx => ({
              id: tx._id,
              type: tx.type,
              amount: tx.amount,
              amountInRupees: tx.amountInRupees,
              description: tx.description,
              status: tx.status,
              balanceBefore: tx.balanceBefore,
              balanceAfter: tx.balanceAfter,
              createdAt: tx.createdAt
            })),
            count: transactions.length
          },
          message: 'Transaction history retrieved successfully'
        });

      case 'statistics':
        // Test user statistics
        const [account, withdrawalStats, transactionStats] = await Promise.all([
          UserAccount.findOne({ userId: deviceId }),
          WithdrawalRequest.getUserWithdrawalStats(deviceId),
          Transaction.getUserStats(deviceId)
        ]);

        return NextResponse.json({
          success: true,
          action: 'statistics',
          data: {
            userAccount: account ? {
              currentBalance: account.currentBalance,
              balanceInRupees: account.balanceInRupees,
              totalEarned: account.totalEarned,
              totalWithdrawn: account.totalWithdrawn,
              winRate: account.winRate,
              statistics: account.statistics
            } : null,
            withdrawalStats,
            transactionStats
          },
          message: 'User statistics retrieved successfully'
        });

      case 'validate-withdrawal':
        // Test withdrawal validation
        const testAmount = parseInt(searchParams.get('amount') || '100');
        const validation = {
          hasMinimumBalance: true,
          canWithdraw: true,
          validationErrors: [] as string[]
        };

        // Check minimum amount
        if (testAmount < 100) {
          validation.canWithdraw = false;
          validation.validationErrors.push('Minimum withdrawal amount is 100 coins');
        }

        // Check user balance (mock for test)
        const mockBalance = 200; // Would fetch from UserAccount in real scenario
        if (testAmount > mockBalance) {
          validation.hasMinimumBalance = false;
          validation.canWithdraw = false;
          validation.validationErrors.push('Insufficient balance');
        }

        return NextResponse.json({
          success: true,
          action: 'validate-withdrawal',
          data: {
            testAmount,
            mockBalance,
            validation
          },
          message: 'Withdrawal validation test completed'
        });

      default:
        // Default status check
        return NextResponse.json({
          success: true,
          action: 'status',
          data: {
            message: 'Withdrawal system test endpoint is working',
            availableActions: [
              'create-account',
              'check-balance', 
              'add-coins',
              'withdrawal-history',
              'transaction-history',
              'statistics',
              'validate-withdrawal'
            ],
            examples: [
              '?action=create-account&deviceId=test-device-001',
              '?action=add-coins&deviceId=test-device-001&amount=50',
              '?action=withdrawal-history&deviceId=test-device-001',
              '?action=validate-withdrawal&deviceId=test-device-001&amount=150'
            ]
          },
          message: 'Use ?action parameter to test specific functionality'
        });
    }

  } catch (error) {
    console.error('Withdrawal test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}