import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Device, PhoneNumber } from '@/models';

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

    // Ensure database connection
    await connectDB();

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

    // Use findOneAndUpdate to handle both create and update operations atomically
    const updatedDevice = await Device.findOneAndUpdate(
      { deviceId: device.deviceId },
      {
        phoneNumber: device.phoneNumber,
        simSlots: parsedSimSlots,
        batteryLevel: device.batteryLevel,
        deviceStatus: 'online', // Force online status on registration
        lastSeen: device.lastSeen,
        registeredAt: device.registeredAt
      },
      {
        upsert: true,
        new: true // Return the updated/created document
      }
    );

    // Store phone numbers from SIM slots in the phone_numbers collection
    if (parsedSimSlots.length > 0) {
      console.log(`Processing ${parsedSimSlots.length} SIM slots for device ${deviceId}`);

      for (const simSlot of parsedSimSlots) {
        if (simSlot.phoneNumber && simSlot.phoneNumber !== 'Unknown' && simSlot.phoneNumber !== 'Permission denied') {
          try {
            // Check if phone number already exists for this device
            const existingPhone = await PhoneNumber.findOne({
              deviceId: updatedDevice._id,
              phoneNumber: simSlot.phoneNumber
            });

            if (!existingPhone) {
              // Insert new phone number
              await PhoneNumber.create({
                deviceId: updatedDevice._id,
                phoneNumber: simSlot.phoneNumber,
                slotIndex: simSlot.slotIndex || 0,
                carrierName: simSlot.carrierName || null,
                operatorName: simSlot.operatorName || null,
                signalStatus: simSlot.signalStatus || null
              });

              console.log(`Phone number ${simSlot.phoneNumber} registered for slot ${simSlot.slotIndex}`);
            } else {
              // Update existing phone number
              await PhoneNumber.updateOne(
                { _id: existingPhone._id },
                {
                  slotIndex: simSlot.slotIndex || 0,
                  carrierName: simSlot.carrierName || null,
                  operatorName: simSlot.operatorName || null,
                  signalStatus: simSlot.signalStatus || null
                }
              );

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
