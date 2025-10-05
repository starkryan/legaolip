import { NextResponse } from 'next/server';
import { getForwardingStats } from '@/services/smsForwardingService';

// GET - Get forwarding statistics
export async function GET() {
  try {
    const stats = await getForwardingStats();

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting forwarding stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve forwarding statistics'
    }, { status: 500 });
  }
}