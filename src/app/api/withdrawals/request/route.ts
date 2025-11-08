import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserAccount, WithdrawalRequest, Transaction, TransactionType, TransactionStatus, WithdrawalStatus } from '@/models';

// POST /api/withdrawals/request - Create new withdrawal request
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { 
      deviceId, 
      amount, 
      bankName, 
      accountHolderName, 
      accountNumber, 
      ifscCode,
      upiId,
      notes 
    } = body;

    // Validate required fields
    if (!deviceId || !amount || !bankName || !accountHolderName || !accountNumber || !ifscCode) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: deviceId, amount, bankName, accountHolderName, accountNumber, ifscCode'
      }, { status: 400 });
    }

    // Validate amount
    const withdrawalAmount = parseInt(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount < 100 || withdrawalAmount > 10000) {
      return NextResponse.json({
        success: false,
        error: 'Invalid withdrawal amount. Minimum: 100 coins, Maximum: 10000 coins'
      }, { status: 400 });
    }

    // Validate IFSC code format
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid IFSC code format'
      }, { status: 400 });
    }

    // Validate UPI ID if provided
    if (upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid UPI ID format'
      }, { status: 400 });
    }

    // Get or create user account
    const userAccount = await UserAccount.getOrCreateUserAccount(deviceId);

    // Check if user can withdraw
    if (userAccount.currentBalance < withdrawalAmount) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance',
        currentBalance: userAccount.currentBalance,
        requestedAmount: withdrawalAmount
      }, { status: 400 });
    }

    // Check account status
    if (userAccount.accountStatus !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Account is not active',
        accountStatus: userAccount.accountStatus
      }, { status: 403 });
    }

    // Check for pending withdrawal requests
    const existingPendingRequest = await WithdrawalRequest.findOne({
      userId: deviceId,
      status: WithdrawalStatus.PENDING
    });

    if (existingPendingRequest) {
      return NextResponse.json({
        success: false,
        error: 'You already have a pending withdrawal request',
        existingRequest: {
          id: existingPendingRequest._id,
          amount: existingPendingRequest.amount,
          createdAt: existingPendingRequest.createdAt
        }
      }, { status: 400 });
    }

    // Prepare bank details
    const bankDetails = {
      bankName: bankName.trim(),
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.toUpperCase().trim(),
      ...(upiId && { upiId: upiId.trim() })
    };

    // Create withdrawal request
    const withdrawalRequest = await WithdrawalRequest.createWithdrawalRequest(
      deviceId,
      withdrawalAmount,
      bankDetails,
      notes?.trim()
    );

    // Create transaction record
    const balanceBefore = userAccount.currentBalance;
    const balanceAfter = balanceBefore - withdrawalAmount;

    const transaction = await Transaction.createTransaction({
      userId: deviceId,
      type: TransactionType.WITHDRAWAL,
      amount: withdrawalAmount,
      description: `Withdrawal request: ${withdrawalAmount} coins (₹${withdrawalAmount / 10})`,
      status: TransactionStatus.PENDING,
      balanceBefore,
      balanceAfter,
      referenceId: withdrawalRequest._id.toString(),
      metadata: {
        withdrawalRequestId: withdrawalRequest._id,
        bankDetails,
        apiEndpoint: '/api/withdrawals/request'
      }
    });

    // Update user balance (deduct amount)
    await UserAccount.updateUserBalance(deviceId, withdrawalAmount, 'debit');

    // Update user statistics
    userAccount.statistics.lastWithdrawalAt = new Date();
    userAccount.statistics.withdrawalCount += 1;
    await userAccount.save();

    // Save bank details for future use
    try {
      await UserAccount.addBankDetails(deviceId, bankDetails, true);
    } catch (bankError) {
      console.warn('Failed to save bank details:', bankError);
      // Don't fail the withdrawal if bank details saving fails
    }

    return NextResponse.json({
      success: true,
      data: {
        withdrawalRequest: {
          id: withdrawalRequest._id,
          amount: withdrawalRequest.amount,
          amountInRupees: withdrawalRequest.amountInRupees,
          status: withdrawalRequest.status,
          bankDetails: {
            bankName: withdrawalRequest.bankDetails.bankName,
            accountHolderName: withdrawalRequest.bankDetails.accountHolderName,
            lastDigits: withdrawalRequest.bankDetails.accountNumber.slice(-4)
          },
          createdAt: withdrawalRequest.createdAt
        },
        transaction: {
          id: transaction._id,
          balanceBefore,
          balanceAfter,
          description: transaction.description
        },
        newBalance: balanceAfter
      },
      message: 'Withdrawal request submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Withdrawal request error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/withdrawals/request - Get withdrawal request details
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const requestId = searchParams.get('requestId');

    if (requestId) {
      // Get specific withdrawal request
      const withdrawalRequest = await WithdrawalRequest.findById(requestId);
      if (!withdrawalRequest) {
        return NextResponse.json({
          success: false,
          error: 'Withdrawal request not found'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: withdrawalRequest
      });
    } else if (deviceId) {
      // Get user's withdrawal requests
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const status = searchParams.get('status') as WithdrawalStatus;

      const offset = (page - 1) * limit;

      const withdrawalRequests = await WithdrawalRequest.getUserWithdrawals(
        deviceId,
        limit,
        offset,
        status
      );

      const total = await WithdrawalRequest.countDocuments({ userId: deviceId });

      return NextResponse.json({
        success: true,
        data: {
          withdrawalRequests,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either deviceId or requestId is required'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Get withdrawal request error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}