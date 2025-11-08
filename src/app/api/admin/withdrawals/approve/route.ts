import { NextRequest, NextResponse } from 'next/server';

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key-2024';

function validateAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader === `Bearer ${ADMIN_KEY}`) {
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!validateAdminAuth(request)) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Valid admin authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { withdrawalId, transactionId, referenceNumber, notes } = body;

    if (!withdrawalId) {
      return NextResponse.json({
        success: false,
        error: 'Missing withdrawal ID'
      }, { status: 400 });
    }

    // Update withdrawal status in the pending store
    const updateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/admin/withdrawals/pending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_KEY}`,
      },
      body: JSON.stringify({
        action: 'approve',
        withdrawalId,
        status: 'approved',
        transactionId,
        referenceNumber,
        notes
      })
    });

    const updateResult = await updateResponse.json();

    if (!updateResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update withdrawal status',
        message: updateResult.error
      }, { status: 500 });
    }

    // Mock approval logic
    console.log('Approving withdrawal:', {
      withdrawalId,
      transactionId,
      referenceNumber,
      notes,
      approvedAt: new Date().toISOString()
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId,
        status: 'approved',
        transactionId,
        referenceNumber,
        notes,
        approvedAt: new Date().toISOString(),
        message: 'Withdrawal approved successfully'
      },
      message: 'Withdrawal request has been approved and processed'
    });

  } catch (error) {
    console.error('Approve withdrawal error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}