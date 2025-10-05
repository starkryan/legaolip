import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, batteryLevel } = body;
    
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'deviceId is required' }, { status: 400 });
    }
    
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
        batteryLevel: batteryLevel !== undefined ? batteryLevel : device.batteryLevel,
        deviceStatus: 'online', // Force online status on heartbeat
        lastSeen: new Date()
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating device heartbeat:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Yes mofo this will sent a heartbeat
