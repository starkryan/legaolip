import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { WithdrawalRequest, WithdrawalStatus } from '@/models';

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

// GET /api/admin/withdrawals/pending - Get all pending withdrawal requests
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

    // Get pending withdrawals from database
    const pendingWithdrawals = await WithdrawalRequest.find({
      status: WithdrawalStatus.PENDING
    })
    .sort({ createdAt: -1 })
    .lean();

    // Format the withdrawals for the admin panel
    const formattedWithdrawals = pendingWithdrawals.map((withdrawal: any) => {
      const createdAt = new Date(withdrawal.createdAt);
      const pendingFor = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));

      // Determine priority based on amount and pending time
      let priority = 'normal';
      if (withdrawal.amount >= 1000 || pendingFor > 48) {
        priority = 'high';
      } else if (withdrawal.amount >= 500 || pendingFor > 24) {
        priority = 'medium';
      }

      return {
        id: withdrawal._id.toString(),
        amount: withdrawal.amount,
        amountInRupees: withdrawal.amountInRupees,
        formattedAmount: `${withdrawal.amount} coins (₹${withdrawal.amountInRupees})`,
        status: withdrawal.status,
        bankDetails: {
          bankName: withdrawal.bankDetails?.bankName || 'N/A',
          accountHolderName: withdrawal.bankDetails?.accountHolderName || 'N/A',
          accountNumber: withdrawal.bankDetails?.accountNumber ?
            `****${withdrawal.bankDetails.accountNumber.slice(-4)}` : 'N/A',
          lastDigits: withdrawal.bankDetails?.accountNumber?.slice(-4) || null,
          upiId: withdrawal.bankDetails?.upiId || null,
          withdrawalType: withdrawal.bankDetails?.withdrawalType || 'upi'
        },
        user: {
          deviceId: withdrawal.userId || 'N/A',
          phoneNumber: 'N/A', // Would need to fetch from UserAccount
          currentBalance: 0,
          balanceInRupees: 0,
          accountStatus: 'active',
          kycStatus: 'verified'
        },
        notes: withdrawal.notes,
        createdAt: createdAt.toISOString(),
        pendingFor,
        priority,
        transactionId: withdrawal.transactionId,
        referenceNumber: withdrawal.referenceNumber,
        rejectionReason: withdrawal.rejectionReason,
        processedAt: withdrawal.processedAt
      };
    });

    // Calculate statistics
    const statistics = {
      totalPending: formattedWithdrawals.length,
      totalAmount: formattedWithdrawals.reduce((sum, w) => sum + w.amount, 0),
      totalRupees: formattedWithdrawals.reduce((sum, w) => sum + w.amountInRupees, 0),
      averageAmount: formattedWithdrawals.length > 0 ?
        Math.round(formattedWithdrawals.reduce((sum, w) => sum + w.amount, 0) / formattedWithdrawals.length) : 0,
      oldestPending: formattedWithdrawals.length > 0 ?
        Math.min(...formattedWithdrawals.map(w => w.pendingFor)) : 0,
      priorityBreakdown: formattedWithdrawals.reduce((acc: Record<string, number>, w) => {
        acc[w.priority] = (acc[w.priority] || 0) + 1;
        return acc;
      }, {})
    };

    return NextResponse.json({
      success: true,
      data: {
        pendingWithdrawals: formattedWithdrawals,
        statistics,
        pagination: {
          page: 1,
          limit: 50,
          total: formattedWithdrawals.length,
          pages: 1,
          hasNext: false,
          hasPrev: false
        },
        filters: {
          availableSortOptions: ['createdAt', 'amount'],
          availableSortOrders: ['asc', 'desc']
        }
      },
      message: `Found ${formattedWithdrawals.length} pending withdrawal requests`
    });

  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/admin/withdrawals/pending - Update withdrawal status
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, withdrawalId, status, transactionId, referenceNumber, notes } = body;

    if (!withdrawalId) {
      return NextResponse.json({
        success: false,
        error: 'Missing withdrawal ID'
      }, { status: 400 });
    }

    // Update withdrawal status in the database
    const updateData: any = {};

    if (status === 'approved' || action === 'approve') {
      updateData.status = WithdrawalStatus.APPROVED;
      updateData.transactionId = transactionId;
      updateData.referenceNumber = referenceNumber;
      updateData.notes = notes;
      updateData.processedAt = new Date();
    } else if (status === 'rejected' || action === 'reject') {
      updateData.status = WithdrawalStatus.REJECTED;
      updateData.rejectionReason = notes;
      updateData.processedAt = new Date();
    }

    const updatedWithdrawal = await WithdrawalRequest.findByIdAndUpdate(
      withdrawalId,
      updateData,
      { new: true }
    );

    if (!updatedWithdrawal) {
      return NextResponse.json({
        success: false,
        error: 'Withdrawal request not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId,
        status: updateData.status,
        message: `Withdrawal ${updateData.status} successfully`
      }
    });

  } catch (error) {
    console.error('Update withdrawal status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}