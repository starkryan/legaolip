import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Device, PhoneNumber, SmsMessage } from '@/models';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    // Ensure database connection
    await connectDB();

    // Find the device first
    const device = await Device.findOne({ deviceId });

    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    // Delete related records first (manual cascade)
    await PhoneNumber.deleteMany({ deviceId: device._id });
    await SmsMessage.deleteMany({ deviceId: device._id });

    // Delete device from database
    await Device.findByIdAndDelete(device._id);

    console.log(`Device deleted: ${deviceId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
