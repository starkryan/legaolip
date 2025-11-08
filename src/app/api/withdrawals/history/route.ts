import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WithdrawalRequest, UserAccount } from '@/models';

// GET /api/withdrawals/history - Get user's withdrawal history
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    // Build query
    const query: any = { userId: deviceId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Get withdrawal requests
    const withdrawalRequests = await WithdrawalRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .select('-__v -metadata'); // Exclude internal fields

    // Get total count for pagination
    const total = await WithdrawalRequest.countDocuments(query);

    // Get user statistics
    const userAccount = await UserAccount.findOne({ userId: deviceId });
    const withdrawalStats = await WithdrawalRequest.getUserWithdrawalStats(deviceId);

    return NextResponse.json({
      success: true,
      data: {
        withdrawalRequests: withdrawalRequests.map(request => ({
          id: request._id,
          amount: request.amount,
          amountInRupees: request.amountInRupees,
          status: request.status,
          formattedAmount: request.formattedAmount,
          bankDetails: {
            bankName: request.bankDetails.bankName,
            accountHolderName: request.bankDetails.accountHolderName,
            lastDigits: request.bankDetails.accountNumber.slice(-4),
            upiId: request.bankDetails.upiId
          },
          transactionId: request.transactionId,
          referenceNumber: request.referenceNumber,
          rejectionReason: request.rejectionReason,
          processedAt: request.processedAt,
          processingTime: request.processingTime,
          notes: request.notes,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt
        })),
        statistics: {
          totalRequested: withdrawalStats[request.status]?.totalAmount || 0,
          totalRupees: withdrawalStats[request.status]?.totalRupees || 0,
          pendingCount: withdrawalStats.pending?.count || 0,
          approvedCount: withdrawalStats.approved?.count || 0,
          rejectedCount: withdrawalStats.rejected?.count || 0,
          processedCount: withdrawalStats.processed?.count || 0
        },
        userAccount: userAccount ? {
          currentBalance: userAccount.currentBalance,
          balanceInRupees: userAccount.balanceInRupees,
          totalWithdrawn: userAccount.totalWithdrawn,
          totalWithdrawnInRupees: userAccount.totalWithdrawnInRupees,
          canWithdraw: userAccount.canWithdraw,
          kycStatus: userAccount.kycStatus,
          savedBankDetails: userAccount.savedBankDetails?.map(bank => ({
            bankName: bank.bankName,
            accountHolderName: bank.accountHolderName,
            lastDigits: bank.accountNumber.slice(-4),
            isDefault: bank.isDefault,
            addedAt: bank.addedAt
          }))
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
    console.error('Get withdrawal history error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}