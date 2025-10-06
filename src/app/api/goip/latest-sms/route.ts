import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getConnectionStatus } from '@/lib/db';
import { SmsMessage, Device } from '@/models';

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const connectionStatus = getConnectionStatus();
    if (!connectionStatus.isConnected) {
      await connectDB();
    }

    // Get the most recent SMS message
    const latestSms = await SmsMessage.findOne()
      .sort({ receivedAt: -1 })
      .populate({
        path: 'deviceId',
        model: Device,
        select: 'deviceId name'
      });

    if (!latestSms) {
      return NextResponse.json(
        { error: 'No SMS messages found' },
        { status: 404 }
      );
    }

    // Format the response
    const response = {
      id: latestSms._id.toString(),
      deviceId: latestSms.deviceId?._id?.toString() || latestSms.deviceId?.toString(),
      deviceName: latestSms.deviceId?.name || 'Unknown Device',
      from: latestSms.sender,
      to: latestSms.recipient,
      message: latestSms.message,
      timestamp: latestSms.receivedAt || latestSms.timestamp || latestSms.createdAt,
      status: latestSms.status,
      createdAt: latestSms.createdAt,
      updatedAt: latestSms.updatedAt,
      slotIndex: latestSms.slotIndex
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching latest SMS:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}