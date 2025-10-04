import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface SimSlot {
  slotIndex: number;
  carrierName: string;
  phoneNumber: string;
  operatorName?: string;
  signalStatus?: string;
}

interface Device {
  deviceId: string;
  phoneNumber: string;
  simSlots: SimSlot[] | number;
  batteryLevel: number;
  deviceStatus: string;
  lastSeen: Date;
  registeredAt: Date;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, phoneNumber, simSlots, batteryLevel, deviceStatus } = body;

    // Validate required fields
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: deviceId is required' },
        { status: 400 }
      );
    }

    const device: Device = {
      deviceId,
      phoneNumber: phoneNumber || '', // Make phoneNumber optional
      simSlots,
      batteryLevel,
      deviceStatus,
      lastSeen: new Date(),
      registeredAt: new Date()
    };

    // Handle simSlots conversion safely
    let simSlotsString: string;
    let parsedSimSlots: SimSlot[] = [];
    try {
      simSlotsString = typeof device.simSlots === 'string'
        ? device.simSlots
        : JSON.stringify(device.simSlots || []);
      parsedSimSlots = typeof device.simSlots === 'string'
        ? JSON.parse(device.simSlots) || []
        : device.simSlots || [];
    } catch (jsonError) {
      console.error('JSON stringify error:', jsonError);
      simSlotsString = '[]';
      parsedSimSlots = [];
    }

    // Use upsert to handle both create and update operations atomically
    const updatedDevice = await prisma.device.upsert({
      where: { deviceId: device.deviceId },
      update: {
        phoneNumber: device.phoneNumber,
        simSlots: parsedSimSlots as any,
        batteryLevel: device.batteryLevel,
        deviceStatus: 'online', // Force online status on registration
        lastSeen: device.lastSeen
      },
      create: {
        deviceId: device.deviceId,
        phoneNumber: device.phoneNumber,
        simSlots: parsedSimSlots as any,
        batteryLevel: device.batteryLevel,
        deviceStatus: 'online', // Force online status on registration
        lastSeen: device.lastSeen,
        registeredAt: device.registeredAt
      }
    });

    // Store phone numbers from both SIM slots in the phone_numbers table
    if (parsedSimSlots.length > 0) {
      console.log(`Processing ${parsedSimSlots.length} SIM slots for device ${deviceId}`);

      for (const simSlot of parsedSimSlots) {
        if (simSlot.phoneNumber && simSlot.phoneNumber !== 'Unknown' && simSlot.phoneNumber !== 'Permission denied') {
          try {
            // Check if phone number already exists for this device
            const existingPhone = await prisma.phoneNumber.findFirst({
              where: {
                deviceId: updatedDevice.id,
                phoneNumber: simSlot.phoneNumber
              }
            });

            if (!existingPhone) {
              // Insert new phone number
              await prisma.phoneNumber.create({
                data: {
                  deviceId: updatedDevice.id,
                  phoneNumber: simSlot.phoneNumber,
                  slotIndex: simSlot.slotIndex || 0,
                  carrierName: simSlot.carrierName || null,
                  operatorName: simSlot.operatorName || null,
                  signalStatus: simSlot.signalStatus || null
                }
              });

              console.log(`Phone number ${simSlot.phoneNumber} registered for slot ${simSlot.slotIndex}`);
            } else {
              // Update existing phone number
              await prisma.phoneNumber.update({
                where: { id: existingPhone.id },
                data: {
                  slotIndex: simSlot.slotIndex || 0,
                  carrierName: simSlot.carrierName || null,
                  operatorName: simSlot.operatorName || null,
                  signalStatus: simSlot.signalStatus || null
                }
              });

              console.log(`Phone number ${simSlot.phoneNumber} updated for slot ${simSlot.slotIndex}`);
            }
          } catch (phoneError) {
            console.error('Error processing phone number:', simSlot.phoneNumber, phoneError);
          }
        } else {
          console.log(`Skipping invalid phone number: ${simSlot.phoneNumber} for slot ${simSlot.slotIndex}`);
        }
      }
    }

    // Get valid phone numbers for display purposes
    const validPhoneNumbers = parsedSimSlots
      .filter(slot => slot.phoneNumber && slot.phoneNumber !== 'Unknown' && slot.phoneNumber !== 'Permission denied')
      .map(slot => slot.phoneNumber)
      .filter(phone => phone.trim() !== '');

    const phoneNumberDisplay = validPhoneNumbers.length > 0 
      ? validPhoneNumbers.join(', ') 
      : 'multiple SIMs';
    console.log(`Device registered: ${deviceId} - ${phoneNumberDisplay}`);

    return NextResponse.json({
      success: true,
      message: 'Device registered successfully',
      phoneNumber: phoneNumberDisplay,
      simSlotsCount: parsedSimSlots.length,
      phoneNumbersStored: validPhoneNumbers.length
    });
  } catch (error) {
    console.error('Registration endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body', details: String(error) },
      { status: 400 }
    );
  }
}
