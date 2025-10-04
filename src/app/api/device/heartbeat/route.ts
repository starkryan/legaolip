import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, batteryLevel } = body;
    
    // Find the device first
    const device = await prisma.device.findUnique({
      where: { deviceId: deviceId }
    });
    
    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }
    
    // Update device heartbeat in database - always set status to 'online' when heartbeat received
    await prisma.device.update({
      where: { id: device.id },
      data: {
        batteryLevel: batteryLevel,
        deviceStatus: 'online', // Force online status on heartbeat
        lastSeen: new Date()
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating device heartbeat:', error);
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

// Yes mofo this will sent a heartbeat
