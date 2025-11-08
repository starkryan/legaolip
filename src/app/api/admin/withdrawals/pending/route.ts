import { NextRequest, NextResponse } from 'next/server';

// Simple admin authentication (in production, use proper auth system)
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key-2024';

// In-memory storage for withdrawal status (in production, use a database)
let withdrawalStatusStore: Record<string, any> = {
  'withdrawal_001': {
    id: 'withdrawal_001',
    amount: 100,
    amountInRupees: 10,
    formattedAmount: '100 coins (₹10)',
    status: 'pending',
    bankDetails: {
      bankName: 'State Bank of India',
      accountHolderName: 'Raju Kumar',
      accountNumber: '****6626',
      ifscCode: 'SBIN0000001',
      lastDigits: '6626',
      upiId: null
    },
    user: {
      deviceId: 'e1368f4eba7a3535',
      phoneNumber: '+91 98765 43210',
      currentBalance: 250,
      balanceInRupees: 25,
      accountStatus: 'active',
      kycStatus: 'verified'
    },
    notes: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    pendingFor: 2,
    priority: 'normal'
  },
  'withdrawal_002': {
    id: 'withdrawal_002',
    amount: 500,
    amountInRupees: 50,
    formattedAmount: '500 coins (₹50)',
    status: 'pending',
    bankDetails: {
      bankName: 'Punjab National Bank',
      accountHolderName: 'Amit Singh',
      accountNumber: '****1234',
      ifscCode: 'PUNB0000001',
      lastDigits: '1234',
      upiId: 'amitsingh@paytm'
    },
    user: {
      deviceId: 'a2b3c4d5e6f7g8h9',
      phoneNumber: '+91 87654 32109',
      currentBalance: 750,
      balanceInRupees: 75,
      accountStatus: 'active',
      kycStatus: 'verified'
    },
    notes: 'Urgent withdrawal requested',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    pendingFor: 6,
    priority: 'medium'
  },
  'withdrawal_003': {
    id: 'withdrawal_003',
    amount: 1500,
    amountInRupees: 150,
    formattedAmount: '1500 coins (₹150)',
    status: 'pending',
    bankDetails: {
      bankName: 'ICICI Bank',
      accountHolderName: 'Priya Sharma',
      accountNumber: '****9876',
      ifscCode: 'ICIC0000001',
      lastDigits: '9876',
      upiId: 'priyasharma@upi'
    },
    user: {
      deviceId: 'f1e2d3c4b5a6987',
      phoneNumber: '+91 98765 12345',
      currentBalance: 2000,
      balanceInRupees: 200,
      accountStatus: 'active',
      kycStatus: 'verified'
    },
    notes: null,
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
    pendingFor: 30,
    priority: 'high'
  }
};

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

    // Get only pending withdrawals from the store
    const pendingWithdrawals = Object.values(withdrawalStatusStore).filter(
      (w: any) => w.status === 'pending'
    ).map((w: any) => ({
      ...w,
      pendingFor: Math.floor((Date.now() - w.createdAt.getTime()) / (1000 * 60 * 60))
    }));

    // Calculate statistics
    const statistics = {
      totalPending: pendingWithdrawals.length,
      totalAmount: pendingWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0),
      totalRupees: pendingWithdrawals.reduce((sum: number, w: any) => sum + w.amountInRupees, 0),
      averageAmount: pendingWithdrawals.length > 0 ? 
        Math.round(pendingWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0) / pendingWithdrawals.length) : 0,
      oldestPending: pendingWithdrawals.length > 0 ?
        Math.min(...pendingWithdrawals.map((w: any) => w.pendingFor)) : 0,
      priorityBreakdown: pendingWithdrawals.reduce((acc: Record<string, number>, w: any) => {
        acc[w.priority] = (acc[w.priority] || 0) + 1;
        return acc;
      }, {})
    };

    return NextResponse.json({
      success: true,
      data: {
        pendingWithdrawals,
        statistics,
        pagination: {
          page: 1,
          limit: 50,
          total: pendingWithdrawals.length,
          pages: 1,
          hasNext: false,
          hasPrev: false
        },
        filters: {
          availableSortOptions: ['createdAt', 'amount'],
          availableSortOrders: ['asc', 'desc']
        }
      },
      message: `Found ${pendingWithdrawals.length} pending withdrawal requests`
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

    const body = await request.json();
    const { action, withdrawalId, status, transactionId, referenceNumber, notes } = body;

    if (!withdrawalId) {
      return NextResponse.json({
        success: false,
        error: 'Missing withdrawal ID'
      }, { status: 400 });
    }

    // Update withdrawal status in the store
    if (withdrawalStatusStore[withdrawalId]) {
      withdrawalStatusStore[withdrawalId].status = status || action;
      
      if (status === 'approved' || action === 'approve') {
        withdrawalStatusStore[withdrawalId].transactionId = transactionId;
        withdrawalStatusStore[withdrawalId].referenceNumber = referenceNumber;
        withdrawalStatusStore[withdrawalId].notes = notes;
        withdrawalStatusStore[withdrawalId].approvedAt = new Date().toISOString();
      } else if (status === 'rejected' || action === 'reject') {
        withdrawalStatusStore[withdrawalId].rejectionReason = notes;
        withdrawalStatusStore[withdrawalId].rejectedAt = new Date().toISOString();
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId,
        status: status || action,
        message: `Withdrawal ${status || action} successfully`
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