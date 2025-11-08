import { NextRequest, NextResponse } from 'next/server';

// Mock stats for now - replace with actual database queries later
export async function GET(request: NextRequest) {
  try {
    // Mock data that would normally come from database
    const stats = {
      totalUsers: 1247,
      pendingWithdrawals: 5,
      totalWithdrawals: 2850000, // ₹28.5L
      todayRevenue: 15250, // ₹15,250
      activeDevices: 89,
      totalMessages: 45892,
      systemHealth: 'healthy'
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}