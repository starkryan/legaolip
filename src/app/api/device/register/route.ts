import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Device, PhoneNumber } from '@/models';
import { getSocketIO } from '@/lib/socket';

interface SimSlot {
  slotIndex: number;
  carrierName: string;
  phoneNumber: string;
  operatorName?: string;
  signalStatus?: string;
}

interface DeviceBrandInfo {
  brand?: string;
  model?: string;
  product?: string;
  board?: string;
  device?: string;
}

interface Device {
  deviceId: string;
  phoneNumber: string;
  simSlots: SimSlot[] | number;
  batteryLevel: number;
  deviceStatus: string;
  lastSeen: Date;
  registeredAt: Date;
  deviceBrandInfo?: DeviceBrandInfo;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, phoneNumber, simSlots, batteryLevel, deviceStatus, deviceBrandInfo } = body;

    console.log(`Device registration: ${deviceId} - ${deviceBrandInfo?.brand || 'Unknown'} ${deviceBrandInfo?.model || ''}`);

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
      registeredAt: new Date(),
      deviceBrandInfo
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
        registeredAt: device.registeredAt,
        deviceBrandInfo: device.deviceBrandInfo
      },
      {
        upsert: true,
        new: true // Return the updated/created document
      }
    );

    // Store phone numbers from SIM slots in the phone_numbers collection
    if (parsedSimSlots.length > 0) {
      console.log(`Processing ${parsedSimSlots.length} SIM slots for device ${deviceId}`);

      // Extract valid phone numbers from current SIM slots
      const validPhoneSlots = parsedSimSlots.filter(simSlot =>
        simSlot.phoneNumber &&
        simSlot.phoneNumber !== 'Unknown' &&
        simSlot.phoneNumber !== 'Permission denied' &&
        simSlot.phoneNumber.trim() !== ''
      );

      // Get current phone numbers for this device to handle cleanup
      const currentPhoneNumbers = await PhoneNumber.find({ deviceId: updatedDevice._id });
      const currentPhoneNumbersSet = new Set(currentPhoneNumbers.map(pn => pn.phoneNumber));

      // Get new phone numbers from current SIM slots
      const newPhoneNumbersSet = new Set(validPhoneSlots.map(slot => slot.phoneNumber));

      // Find phone numbers to remove (exist in DB but not in current SIM slots)
      const phoneNumbersToRemove = currentPhoneNumbers.filter(pn =>
        !newPhoneNumbersSet.has(pn.phoneNumber)
      );

      // Remove stale phone numbers first
      if (phoneNumbersToRemove.length > 0) {
        const phoneNumbersToRemoveStrings = phoneNumbersToRemove.map(pn => pn.phoneNumber);
        const deleteResult = await PhoneNumber.deleteMany({
          deviceId: updatedDevice._id,
          phoneNumber: { $in: phoneNumbersToRemoveStrings }
        });
        console.log(`Removed ${deleteResult.deletedCount} stale phone numbers for device ${deviceId}:`, phoneNumbersToRemoveStrings);
      }

      if (validPhoneSlots.length > 0) {
        // Use bulk operations for better performance
        const bulkOps: any[] = [];

        for (const simSlot of validPhoneSlots) {
          // Convert signalStatus to numeric signal value (0-15)
          let signalValue = 0;
          if (simSlot.signalStatus) {
            switch (simSlot.signalStatus.toLowerCase()) {
              case 'excellent': signalValue = 15; break;
              case 'good': signalValue = 12; break;
              case 'fair': signalValue = 8; break;
              case 'poor': signalValue = 4; break;
              case 'very poor': signalValue = 2; break;
              default: signalValue = 0;
            }
          }

          // Use findOneAndUpdate with upsert to handle duplicates efficiently
          bulkOps.push({
            updateOne: {
              filter: {
                deviceId: updatedDevice._id,
                phoneNumber: simSlot.phoneNumber
              },
              update: {
                $set: {
                  slotIndex: simSlot.slotIndex || 0,
                  carrierName: simSlot.carrierName || null,
                  operatorName: simSlot.operatorName || null,
                  signalStatus: simSlot.signalStatus || null,
                  signal: signalValue, // Add numeric signal value
                  updatedAt: new Date()
                },
                $setOnInsert: {
                  deviceId: updatedDevice._id,
                  phoneNumber: simSlot.phoneNumber,
                  createdAt: new Date()
                }
              },
              upsert: true
            }
          });
        }

        if (bulkOps.length > 0) {
          try {
            const result = await PhoneNumber.bulkWrite(bulkOps);
            console.log(`Bulk phone number operations completed:`, {
              matched: result.matchedCount,
              upserted: result.upsertedCount,
              modified: result.modifiedCount
            });
          } catch (bulkError: any) {
            console.error('Error in bulk phone number operations:', bulkError);
            // Fallback to individual operations if bulk fails
            for (const simSlot of validPhoneSlots) {
              try {
                // Convert signalStatus to numeric signal value (0-15)
                let signalValue = 0;
                if (simSlot.signalStatus) {
                  switch (simSlot.signalStatus.toLowerCase()) {
                    case 'excellent': signalValue = 15; break;
                    case 'good': signalValue = 12; break;
                    case 'fair': signalValue = 8; break;
                    case 'poor': signalValue = 4; break;
                    case 'very poor': signalValue = 2; break;
                    default: signalValue = 0;
                  }
                }

                await PhoneNumber.findOneAndUpdate(
                  { deviceId: updatedDevice._id, phoneNumber: simSlot.phoneNumber },
                  {
                    $set: {
                      slotIndex: simSlot.slotIndex || 0,
                      carrierName: simSlot.carrierName || null,
                      operatorName: simSlot.operatorName || null,
                      signalStatus: simSlot.signalStatus || null,
                      signal: signalValue, // Add numeric signal value
                      updatedAt: new Date()
                    },
                    $setOnInsert: {
                      deviceId: updatedDevice._id,
                      phoneNumber: simSlot.phoneNumber,
                      createdAt: new Date()
                    }
                  },
                  { upsert: true }
                );
                console.log(`Phone number ${simSlot.phoneNumber} processed for slot ${simSlot.slotIndex}`);
              } catch (phoneError) {
                console.error('Error processing phone number:', simSlot.phoneNumber, phoneError);
              }
            }
          }
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

    // Emit real-time updates via Socket.IO
    try {
      const io = getSocketIO();
      if (io) {
        // Get phone numbers for the registered device
        const phoneNumbers = await PhoneNumber.find({ deviceId: updatedDevice._id });

        if (updatedDevice) {
          const deviceData = {
            deviceId: updatedDevice.deviceId,
            phoneNumber: updatedDevice.phoneNumber,
            batteryLevel: updatedDevice.batteryLevel,
            deviceStatus: updatedDevice.deviceStatus,
            lastSeen: updatedDevice.lastSeen,
            registeredAt: updatedDevice.registeredAt,
            simSlots: updatedDevice.simSlots,
            phoneNumbers: phoneNumbers,
            deviceBrandInfo: updatedDevice.deviceBrandInfo,
            isOnline: updatedDevice.deviceStatus === 'online'
          };

          // Emit to device-specific room
          io.to(`device-${deviceId}`).emit('device-heartbeat', deviceData);
          io.to('dashboard').emit('device-heartbeat', deviceData);

          // Emit device status change for new registration
          io.to('dashboard').emit('device-status-change', {
            deviceId: updatedDevice.deviceId,
            previousStatus: null,
            currentStatus: updatedDevice.deviceStatus,
            isOnline: true,
            isNewDevice: true
          });

          // Update and broadcast stats
          const totalDevices = await Device.countDocuments();
          const onlineDevices = await Device.countDocuments({ deviceStatus: 'online' });

          io.to('dashboard').emit('stats-update', {
            totalDevices,
            onlineDevices,
            deviceId: updatedDevice.deviceId,
            timestamp: new Date()
          });

          console.log(`Device registered: ${deviceId} (${deviceBrandInfo?.brand || 'Unknown'} ${deviceBrandInfo?.model || ''})`);
        }
      }
    } catch (socketError) {
      console.error('Error emitting socket events during registration:', socketError);
      // Don't fail the registration if socket emission fails
    }

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
