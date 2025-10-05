import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SmsMessage, Device, PhoneNumber } from '@/models';

export async function GET() {
  try {
    // Ensure database connection
    await connectDB();

    // Fetch all SMS messages from database with device and phone number info
    const messages = await SmsMessage.find({})
      .sort({ receivedAt: -1 })
      .populate({
        path: 'deviceId',
        model: 'Device',
        select: 'deviceId simSlots'
      })
      .lean();

    // Transform the data to match the expected format with enhanced slot info
    const transformedMessages = await Promise.all(messages.map(async (message: any) => {
      const device = message.deviceId as any;

      // Get carrier info from device simSlots first
      let carrierInfo = message.slotIndex !== null && Array.isArray(device?.simSlots)
        ? device.simSlots.find((slot: any) => slot.slotIndex === message.slotIndex)
        : null;

      // If not found in simSlots, try to get from phoneNumbers table
      if (!carrierInfo && message.slotIndex !== null && device?._id) {
        const phoneNumberInfo = await PhoneNumber.findOne({
          deviceId: device._id,
          slotIndex: message.slotIndex
        }).lean();

        if (phoneNumberInfo) {
          carrierInfo = {
            slotIndex: (phoneNumberInfo as any).slotIndex,
            carrierName: (phoneNumberInfo as any).carrierName,
            phoneNumber: (phoneNumberInfo as any).phoneNumber,
            signalStatus: (phoneNumberInfo as any).signalStatus
          };
        }
      }

      const carrierName = carrierInfo?.carrierName || `SIM${message.slotIndex || 0}`;

      return {
        id: message._id,
        deviceId: device?.deviceId,
        sender: message.sender,
        recipient: message.recipient,
        message: message.message,
        timestamp: message.timestamp,
        receivedAt: message.receivedAt,
        sentAt: message.sentAt,
        status: message.status,
        slotIndex: message.slotIndex,
        carrierName: carrierName,
        slotInfo: carrierInfo
      };
    }));

    return NextResponse.json({ messages: transformedMessages });
  } catch (error) {
    console.error('Error fetching SMS messages:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve SMS messages' }, { status: 500 });
  }
}
