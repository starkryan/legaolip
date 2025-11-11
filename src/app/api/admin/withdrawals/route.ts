import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WithdrawalRequest, Transaction, UserAccount, WithdrawalStatus, TransactionStatus } from '@/models';

// Simple admin authentication (in production, use proper auth system)
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key-2024';

function validateAdminAuth(request: NextRequest): boolean {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader === `Bearer ${ADMIN_KEY}`) {
    return true;
  }

  // Check query parameter for easier testing
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('adminKey');
  if (adminKey === ADMIN_KEY) {
    return true;
  }

  return false;
}

// GET /api/admin/withdrawals - Get withdrawal requests for admin
export async function GET(request: NextRequest) {
  try {
    // Validate admin authentication
    if (!validateAdminAuth(request)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Valid admin authentication required'
      }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as WithdrawalStatus;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
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

    // Get withdrawal requests
    const withdrawalRequests = await WithdrawalRequest.find(query)
      .sort({ createdAt: status === 'pending' ? 1 : -1 }) // Oldest first for pending
      .limit(limit)
      .skip(offset)
      .select('-__v -metadata');

    // Get total count
    const total = await WithdrawalRequest.countDocuments(query);

    // Get statistics
    const stats = await WithdrawalRequest.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          totalRupees: { $sum: '$amountInRupees' },
          count: { $sum: 1 }
        }
      }
    ]);

    const statistics = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        totalAmount: stat.totalAmount,
        totalRupees: stat.totalRupees,
        count: stat.count
      };
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        withdrawalRequests: withdrawalRequests.map(request => ({
          id: request._id,
          user: {
            deviceId: request.userId || 'N/A',
            phoneNumber: 'N/A', // Would need to fetch from UserAccount
            deviceBrand: 'Unknown',
            model: 'Unknown'
          },
          amount: request.amount,
          amountInRupees: request.amountInRupees,
          status: request.status,
          bankDetails: request.bankDetails,
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
          pending: statistics.pending || { totalAmount: 0, totalRupees: 0, count: 0 },
          approved: statistics.approved || { totalAmount: 0, totalRupees: 0, count: 0 },
          rejected: statistics.rejected || { totalAmount: 0, totalRupees: 0, count: 0 },
          processed: statistics.processed || { totalAmount: 0, totalRupees: 0, count: 0 },
          total: {
            totalAmount: Object.values(statistics).reduce((sum: number, stat: any) => sum + stat.totalAmount, 0),
            totalRupees: Object.values(statistics).reduce((sum: number, stat: any) => sum + stat.totalRupees, 0),
            count: Object.values(statistics).reduce((sum: number, stat: any) => sum + stat.count, 0)
          }
        },
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
    console.error('Get admin withdrawals error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/admin/withdrawals - Process withdrawal request
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { withdrawalId, action, transactionId, referenceNumber, rejectionReason, adminNotes } = body;

    if (!withdrawalId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: withdrawalId, action'
      }, { status: 400 });
    }

    if (!['approve', 'reject', 'process'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be: approve, reject, or process'
      }, { status: 400 });
    }

    // Get withdrawal request
    const withdrawalRequest = await WithdrawalRequest.findById(withdrawalId);

    if (!withdrawalRequest) {
      return NextResponse.json({
        success: false,
        error: 'Withdrawal request not found'
      }, { status: 404 });
    }

    if (withdrawalRequest.status !== WithdrawalStatus.PENDING && 
        withdrawalRequest.status !== WithdrawalStatus.APPROVED) {
      return NextResponse.json({
        success: false,
        error: 'Withdrawal request cannot be processed in current status',
        currentStatus: withdrawalRequest.status
      }, { status: 400 });
    }

    let newStatus: WithdrawalStatus = withdrawalRequest.status; // Default to current status
    let transactionRecord: any = null;

    if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json({
          success: false,
          error: 'Rejection reason is required'
        }, { status: 400 });
      }

      newStatus = WithdrawalStatus.REJECTED;

      // Get user account for balance info
      const userAccount = await UserAccount.getOrCreateUserAccount(withdrawalRequest.userId.toString());
      const balanceBefore = userAccount.currentBalance;
      const balanceAfter = balanceBefore + withdrawalRequest.amount;

      // Update the original withdrawal transaction to cancel it and refund balance
      const originalTransaction = await Transaction.findOne({
        userId: withdrawalRequest.userId.toString(),
        referenceId: withdrawalRequest._id.toString(),
        type: 'withdrawal'
      });

      if (originalTransaction) {
        // Update the original withdrawal transaction to cancelled status
        originalTransaction.status = TransactionStatus.CANCELLED;
        originalTransaction.metadata = {
          ...originalTransaction.metadata,
          rejectionReason,
          adminNotes,
          cancelledBy: 'admin',
          cancelledAt: new Date()
        };
        await originalTransaction.save();
      }

      // Create a single refund transaction that handles the balance restoration
      transactionRecord = await Transaction.createTransaction({
        userId: withdrawalRequest.userId.toString(),
        type: 'refund' as any,
        amount: withdrawalRequest.amount,
        description: `Withdrawal cancelled: ${withdrawalRequest.amount} coins refunded`,
        status: TransactionStatus.COMPLETED,
        balanceBefore,
        balanceAfter,
        referenceId: withdrawalRequest._id.toString(),
        metadata: {
          withdrawalRequestId: withdrawalRequest._id,
          rejectionReason,
          adminNotes,
          refundedBy: 'admin',
          originalTransactionId: originalTransaction?._id?.toString()
        }
      });

      // Update user balance (single update through the transaction system)
      await UserAccount.updateUserBalance(withdrawalRequest.userId.toString(), withdrawalRequest.amount, 'credit');

      // Update withdrawal request
      await WithdrawalRequest.updateWithdrawalStatus(
        withdrawalId,
        newStatus,
        transactionRecord._id.toString(),
        rejectionReason
      );

    } else if (action === 'approve') {
      newStatus = WithdrawalStatus.APPROVED;

      await WithdrawalRequest.updateWithdrawalStatus(
        withdrawalId,
        newStatus
      );

    } else if (action === 'process') {
      if (!transactionId || !referenceNumber) {
        return NextResponse.json({
          success: false,
          error: 'Transaction ID and reference number are required for processing'
        }, { status: 400 });
      }

      newStatus = WithdrawalStatus.PROCESSED;

      // Update withdrawal request with processing details
      await WithdrawalRequest.updateWithdrawalStatus(
        withdrawalId,
        newStatus,
        transactionId,
        referenceNumber
      );

      // Update transaction status
      await Transaction.updateMany(
        {
          userId: withdrawalRequest.userId.toString(),
          referenceId: withdrawalRequest._id.toString()
        },
        {
          status: TransactionStatus.COMPLETED,
          metadata: {
            processedTransactionId: transactionId,
            referenceNumber,
            processedAt: new Date(),
            adminNotes
          }
        }
      );
    }

    // Get updated withdrawal request
    const updatedRequest = await WithdrawalRequest.findById(withdrawalId);

    return NextResponse.json({
      success: true,
      data: {
        withdrawalRequest: updatedRequest,
        transaction: transactionRecord,
        action: action,
        newStatus: newStatus,
        processedAt: new Date()
      },
      message: `Withdrawal request ${action}d successfully`
    });

  } catch (error) {
    console.error('Process withdrawal error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}