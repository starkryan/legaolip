import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    
    // Find the device first
    const device = await prisma.device.findUnique({
      where: { deviceId: deviceId }
    });
    
    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }
    
    // Delete device from database (this will cascade delete related records)
    await prisma.device.delete({
      where: { id: device.id }
    });
    
    console.log(`Device deleted: ${deviceId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
