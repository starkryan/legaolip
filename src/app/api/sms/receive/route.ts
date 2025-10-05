import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitToDashboard, emitToDevice } from '@/lib/socket';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, sender, message, timestamp, recipient, slotIndex } = body;
    
    // Find the device first with phone numbers
    const device = await prisma.device.findUnique({
      where: { deviceId: deviceId },
      include: {
        phoneNumbers: true
      }
    });
    
    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }
    
    // Determine which phone number received the message based on recipient
    let recipientPhoneNumber = recipient;
    let recipientSlotIndex = slotIndex;
    
    if (recipient && device.phoneNumbers.length > 0) {
      // Find the phone number record that matches the recipient
      const phoneNumberRecord = device.phoneNumbers.find((pn: any) => pn.phoneNumber === recipient);
      if (phoneNumberRecord) {
        recipientSlotIndex = phoneNumberRecord.slotIndex;
        recipientPhoneNumber = phoneNumberRecord.phoneNumber;
      }
    }
    
    // Insert SMS message into database with slot information
    const smsMessage = await prisma.smsMessage.create({
      data: {
        deviceId: device.id,
        sender: sender,
        message: message,
        recipient: recipientPhoneNumber,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        receivedAt: new Date(),
        slotIndex: recipientSlotIndex
      }
    });
    
    // Get carrier name for the slot if available
    const simSlots = device.simSlots as any[];
    const carrierInfo = recipientSlotIndex !== null && Array.isArray(simSlots) 
      ? simSlots.find((slot: any) => slot.slotIndex === recipientSlotIndex)
      : null;
    
    const carrierName = carrierInfo?.carrierName || `SIM${recipientSlotIndex || 0}`;
    
    console.log(`SMS received on ${carrierName} (${recipientPhoneNumber}) from ${sender}: ${message}`);

    // Emit real-time SMS notification via Socket.IO
    try {
      const smsData = {
        id: smsMessage.id,
        deviceId: device.id,
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
      emitToDevice(deviceId, 'sms-received', smsData);
      
      // Emit to dashboard for global SMS updates
      emitToDashboard('sms-received', smsData);

      // Update and broadcast SMS stats
      const totalSms = await prisma.smsMessage.count();
      const receivedSms = await prisma.smsMessage.count({
        where: { sender: { not: null } }
      });
      
      emitToDashboard('stats-update', {
        totalSms,
        receivedSms,
        type: 'sms',
        deviceId: device.deviceId,
        timestamp: new Date()
      });

    } catch (socketError) {
      console.error('Error emitting SMS socket events:', socketError);
      // Don't fail the SMS processing if socket emission fails
    }
    
    return NextResponse.json({ 
      success: true, 
      messageId: smsMessage.id,
      slotIndex: recipientSlotIndex,
      carrierName: carrierName,
      recipient: recipientPhoneNumber
    });
  } catch (error) {
    console.error('Error receiving SMS:', error);
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
