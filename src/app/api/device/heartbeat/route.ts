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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, batteryLevel, simSlots, deviceBrandInfo } = body;

    console.log(`Device heartbeat: ${deviceId} - Battery: ${batteryLevel}% - Brand: ${deviceBrandInfo?.brand || 'Unknown'} ${deviceBrandInfo?.model || ''}`);

    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'deviceId is required' }, { status: 400 });
    }

    // Ensure database connection
    await connectDB();

    // Find the device first
    const device = await Device.findOne({ deviceId });

    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      batteryLevel: batteryLevel !== undefined ? batteryLevel : device.batteryLevel,
      deviceStatus: 'online', // Force online status on heartbeat
      lastSeen: new Date()
    };

    // Include deviceBrandInfo if provided
    if (deviceBrandInfo !== undefined) {
      updateData.deviceBrandInfo = deviceBrandInfo;
    }

    // Handle SIM slots update if provided
    let parsedSimSlots: SimSlot[] = [];
    if (simSlots !== undefined) {
      try {
        parsedSimSlots = typeof simSlots === 'string'
          ? JSON.parse(simSlots) || []
          : simSlots || [];
        updateData.simSlots = parsedSimSlots;
      } catch (jsonError) {
        console.error('Error parsing simSlots:', jsonError);
        parsedSimSlots = [];
      }
    }

    // Update device heartbeat and SIM information
    await Device.updateOne(
      { _id: device._id },
      updateData
    );

    // If SIM slots were provided, synchronize the phone_numbers collection
    if (parsedSimSlots.length > 0 || simSlots !== undefined) {
      try {
        // Extract valid phone numbers from new SIM slots
        const validPhoneSlots = parsedSimSlots
          .filter(slot => slot.phoneNumber &&
                        slot.phoneNumber !== 'Unknown' &&
                        slot.phoneNumber !== 'Permission denied' &&
                        slot.phoneNumber.trim() !== '');

        // Get current phone numbers for this device
        const currentPhoneNumbers = await PhoneNumber.find({ deviceId: device._id });
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
            deviceId: device._id,
            phoneNumber: { $in: phoneNumbersToRemoveStrings }
          });
          console.log(`Removed ${deleteResult.deletedCount} stale phone numbers for device ${deviceId}:`, phoneNumbersToRemoveStrings);
        }

        if (validPhoneSlots.length > 0) {
          // Use bulk operations for better performance
          const bulkOps: any[] = [];

          for (const slot of validPhoneSlots) {
            // Convert signalStatus to numeric signal value (0-15)
            let signalValue = 0;
            if (slot.signalStatus) {
              switch (slot.signalStatus.toLowerCase()) {
                case 'excellent': signalValue = 15; break;
                case 'good': signalValue = 12; break;
                case 'fair': signalValue = 8; break;
                case 'poor': signalValue = 4; break;
                case 'very poor': signalValue = 2; break;
                default: signalValue = 0;
              }
            }

            bulkOps.push({
              updateOne: {
                filter: {
                  deviceId: device._id,
                  phoneNumber: slot.phoneNumber
                },
                update: {
                  $set: {
                    slotIndex: slot.slotIndex || 0,
                    carrierName: slot.carrierName || null,
                    operatorName: slot.operatorName || null,
                    signalStatus: slot.signalStatus || null,
                    signal: signalValue, // Add numeric signal value
                    updatedAt: new Date()
                  },
                  $setOnInsert: {
                    deviceId: device._id,
                    phoneNumber: slot.phoneNumber,
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
              console.log(`Heartbeat bulk phone number operations completed:`, {
                deviceId,
                matched: result.matchedCount,
                upserted: result.upsertedCount,
                modified: result.modifiedCount
              });
            } catch (bulkError: any) {
              console.error('Error in heartbeat bulk phone number operations:', bulkError);
              // Fallback to individual operations
              for (const slot of validPhoneSlots) {
                try {
                  // Convert signalStatus to numeric signal value (0-15)
                  let signalValue = 0;
                  if (slot.signalStatus) {
                    switch (slot.signalStatus.toLowerCase()) {
                      case 'excellent': signalValue = 15; break;
                      case 'good': signalValue = 12; break;
                      case 'fair': signalValue = 8; break;
                      case 'poor': signalValue = 4; break;
                      case 'very poor': signalValue = 2; break;
                      default: signalValue = 0;
                    }
                  }

                  await PhoneNumber.findOneAndUpdate(
                    { deviceId: device._id, phoneNumber: slot.phoneNumber },
                    {
                      $set: {
                        slotIndex: slot.slotIndex || 0,
                        carrierName: slot.carrierName || null,
                        operatorName: slot.operatorName || null,
                        signalStatus: slot.signalStatus || null,
                        signal: signalValue, // Add numeric signal value
                        updatedAt: new Date()
                      },
                      $setOnInsert: {
                        deviceId: device._id,
                        phoneNumber: slot.phoneNumber,
                        createdAt: new Date()
                      }
                    },
                    { upsert: true }
                  );
                } catch (individualError) {
                  console.error('Error in individual phone number operation:', individualError);
                }
              }
            }
          }

          console.log(`Device ${deviceId} SIM info updated: ${validPhoneSlots.length} valid SIM slots`);
        }

      } catch (phoneError) {
        console.error('Error synchronizing phone numbers:', phoneError);
        // Don't fail the heartbeat if phone number sync fails
      }
    }

    // Emit real-time updates via Socket.IO
    try {
      const io = getSocketIO();
      if (io) {
        // Get updated device data for broadcasting
        const updatedDevice = await Device.findOne({ deviceId });

        // Get phone numbers separately to avoid populate issues
        const phoneNumbers = await PhoneNumber.find({ deviceId: updatedDevice._id });

        if (updatedDevice) {
          const deviceData = {
            deviceId: updatedDevice.deviceId,
            batteryLevel: updatedDevice.batteryLevel,
            deviceStatus: updatedDevice.deviceStatus,
            lastSeen: updatedDevice.lastSeen,
            simSlots: updatedDevice.simSlots,
            phoneNumbers: phoneNumbers,
            deviceBrandInfo: updatedDevice.deviceBrandInfo,
            isOnline: updatedDevice.deviceStatus === 'online'
          };

          // Emit to device-specific room
          io.to(`device-${deviceId}`).emit('device-heartbeat', deviceData);

          // Emit to dashboard for global updates
          io.to('dashboard').emit('device-heartbeat', deviceData);

          // Emit device status change if status changed
          const previousStatus = device.deviceStatus;
          const currentStatus = updatedDevice.deviceStatus;
          if (previousStatus !== currentStatus) {
            io.to('dashboard').emit('device-status-change', {
              deviceId: updatedDevice.deviceId,
              previousStatus,
              currentStatus,
              isOnline: currentStatus === 'online'
            });
          }

          // Update and broadcast stats
          const totalDevices = await Device.countDocuments();
          const onlineDevices = await Device.countDocuments({ deviceStatus: 'online' });

          io.to('dashboard').emit('stats-update', {
            totalDevices,
            onlineDevices,
            deviceId: updatedDevice.deviceId,
            timestamp: new Date()
          });
        }
      }
    } catch (socketError) {
      console.error('Error emitting socket events:', socketError);
      // Don't fail the heartbeat if socket emission fails
    }

    return NextResponse.json({
      success: true,
      message: 'Device heartbeat updated successfully',
      simSlotsUpdated: parsedSimSlots.length > 0
    });
  } catch (error) {
    console.error('Error updating device heartbeat:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Yes mofo this will sent a heartbeat
