import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Device, PhoneNumber } from '@/models';

// Function to determine online/offline status based on last seen timestamp
function getDeviceStatus(lastSeen: Date | string): { status: string; lastSeen: Date } {
  const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);

  return {
    status: diffInMinutes <= 2 ? 'online' : 'offline', // Consider online if last seen within 2 minutes
    lastSeen: lastSeenDate
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId query parameter is required' },
        { status: 400 }
      );
    }

    // Ensure database connection
    await connectDB();

    // Fetch device from database
    const device = await Device.findOne({ deviceId }).lean();

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    // Determine online/offline status
    const statusInfo = getDeviceStatus(device.lastSeen);

    const deviceWithStatus = {
      deviceId: device.deviceId,
      phoneNumber: device.phoneNumber,
      simSlots: device.simSlots,
      batteryLevel: device.batteryLevel,
      deviceStatus: statusInfo.status,
      lastSeen: statusInfo.lastSeen,
      registeredAt: device.registeredAt,
      calculatedStatus: statusInfo.status
    };

    return NextResponse.json({ success: true, device: deviceWithStatus });
  } catch (error) {
    console.error('Status endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve device status' },
      { status: 500 }
    );
  }
}
