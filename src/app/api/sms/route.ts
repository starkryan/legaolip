import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all SMS messages from database with device and slot info
    const messages = await prisma.smsMessage.findMany({
      orderBy: {
        receivedAt: 'desc'
      },
      include: {
        device: {
          select: {
            deviceId: true,
            simSlots: true
          }
        }
      }
    });
    
    // Transform the data to match the expected format with enhanced slot info
    const transformedMessages = messages.map((message: any) => {
      // Get carrier info for the slot if available
      const carrierInfo = message.slotIndex !== null && Array.isArray(message.device.simSlots) 
        ? message.device.simSlots.find((slot: any) => slot.slotIndex === message.slotIndex)
        : null;
      
      const carrierName = carrierInfo?.carrierName || `SIM${message.slotIndex || 0}`;
      
      return {
        id: message.id,
        deviceId: message.device.deviceId,
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
    });
    
    return NextResponse.json({ messages: transformedMessages });
  } catch (error) {
    console.error('Error fetching SMS messages:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve SMS messages' }, { status: 500 });
  }
}
