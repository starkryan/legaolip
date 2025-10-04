import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
