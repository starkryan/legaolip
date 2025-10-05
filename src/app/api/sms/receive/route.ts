import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SmsMessage, Device, PhoneNumber } from '@/models';
import { getSocketIO } from '@/lib/socket';
import { forwardSms } from '@/services/smsForwardingService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, sender, message, timestamp, recipient, slotIndex } = body;

    // Ensure database connection
    await connectDB();

    // Find the device first
    const device = await Device.findOne({ deviceId }).lean();

    // Find phone numbers for this device separately
    const phoneNumbers = device ? await PhoneNumber.find({ deviceId: device._id }).lean() : [];

    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    // Determine which phone number received the message based on recipient
    let recipientPhoneNumber = recipient;
    let recipientSlotIndex = slotIndex;

    if (recipient && phoneNumbers.length > 0) {
      // Find the phone number record that matches the recipient
      const phoneNumberRecord = phoneNumbers.find((pn: any) => pn.phoneNumber === recipient);
      if (phoneNumberRecord) {
        recipientSlotIndex = phoneNumberRecord.slotIndex;
        recipientPhoneNumber = phoneNumberRecord.phoneNumber;
      }
    }

    // Insert SMS message into database with slot information
    const smsMessage = await SmsMessage.create({
      deviceId: device._id,
      sender: sender,
      message: message,
      recipient: recipientPhoneNumber,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      receivedAt: new Date(),
      slotIndex: recipientSlotIndex
    });

    // Get carrier name for the slot if available
    const simSlots = device.simSlots as any[];
    const carrierInfo = recipientSlotIndex !== null && Array.isArray(simSlots)
      ? simSlots.find((slot: any) => slot.slotIndex === recipientSlotIndex)
      : null;

    const carrierName = carrierInfo?.carrierName || `SIM${recipientSlotIndex || 0}`;

    console.log(`SMS received on ${carrierName} (${recipientPhoneNumber}) from ${sender}: ${message}`);

    // Forward SMS to configured URLs
    try {
      const smsData = {
        _id: smsMessage._id,
        id: smsMessage._id,
        deviceId: device._id,
        sender: sender,
        recipient: recipientPhoneNumber,
        message: message,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        receivedAt: new Date(),
        slotIndex: recipientSlotIndex,
        carrierName: carrierName,
        slotInfo: {
          slotIndex: recipientSlotIndex,
          carrierName: carrierName,
          phoneNumber: recipientPhoneNumber
        }
      };

      // Forward to configured URLs asynchronously (don't block SMS processing)
      forwardSms(smsData, device).catch(error => {
        console.error('SMS forwarding error:', error);
      });
    } catch (forwardingError) {
      console.error('Error preparing SMS forwarding:', forwardingError);
      // Don't fail the SMS processing if forwarding fails
    }

    // Emit real-time SMS notification via Socket.IO
    try {
      const io = getSocketIO();
      if (io) {
        const smsData = {
          id: smsMessage._id,
          deviceId: device._id,
          deviceIdStr: device.deviceId,
          sender: sender,
          recipient: recipientPhoneNumber,
          message: message,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          receivedAt: new Date(),
          slotIndex: recipientSlotIndex,
          carrierName: carrierName,
          slotInfo: {
            slotIndex: recipientSlotIndex,
            carrierName: carrierName,
            phoneNumber: recipientPhoneNumber
          }
        };

        // Emit to device-specific room
        io.to(`device-${deviceId}`).emit('sms-received', smsData);

        // Emit to dashboard for global SMS updates
        io.to('dashboard').emit('sms-received', smsData);

        // Update and broadcast SMS stats
        const totalSms = await SmsMessage.countDocuments();
        const receivedSms = await SmsMessage.countDocuments({ sender: { $ne: null } });

        io.to('dashboard').emit('stats-update', {
          totalSms,
          receivedSms,
          type: 'sms',
          deviceId: device.deviceId,
          timestamp: new Date()
        });
      }

    } catch (socketError) {
      console.error('Error emitting SMS socket events:', socketError);
      // Don't fail the SMS processing if socket emission fails
    }

    return NextResponse.json({
      success: true,
      messageId: smsMessage._id,
      slotIndex: recipientSlotIndex,
      carrierName: carrierName,
      recipient: recipientPhoneNumber
    });
  } catch (error) {
    console.error('Error receiving SMS:', error);
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
