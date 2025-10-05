import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSocketIO } from '@/lib/socket';

interface SimSlot {
  slotIndex: number;
  carrierName: string;
  phoneNumber: string;
  operatorName?: string;
  signalStatus?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, batteryLevel, simSlots } = body;
    
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'deviceId is required' }, { status: 400 });
    }
    
    // Find the device first
    const device = await prisma.device.findUnique({
      where: { deviceId: deviceId }
    });
    
    if (!device) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      batteryLevel: batteryLevel !== undefined ? batteryLevel : device.batteryLevel,
      deviceStatus: 'online', // Force online status on heartbeat
      lastSeen: new Date()
    };

    // Handle SIM slots update if provided
    let parsedSimSlots: SimSlot[] = [];
    if (simSlots !== undefined) {
      try {
        parsedSimSlots = typeof simSlots === 'string' 
          ? JSON.parse(simSlots) || [] 
          : simSlots || [];
        updateData.simSlots = parsedSimSlots as any;
      } catch (jsonError) {
        console.error('Error parsing simSlots:', jsonError);
        parsedSimSlots = [];
      }
    }

    // Update device heartbeat and SIM information
    await prisma.device.update({
      where: { id: device.id },
      data: updateData
    });

    // If SIM slots were provided, synchronize the phone_numbers table
    if (parsedSimSlots.length > 0 || simSlots !== undefined) {
      try {
        // Get current phone numbers for this device
        const currentPhoneNumbers = await prisma.phoneNumber.findMany({
          where: { deviceId: device.id }
        });

        // Extract valid phone numbers from new SIM slots
        const newPhoneNumbers = parsedSimSlots
          .filter(slot => slot.phoneNumber && 
                        slot.phoneNumber !== 'Unknown' && 
                        slot.phoneNumber !== 'Permission denied' &&
                        slot.phoneNumber.trim() !== '')
          .map(slot => ({
            phoneNumber: slot.phoneNumber,
            slotIndex: slot.slotIndex || 0,
            carrierName: slot.carrierName || null,
            operatorName: slot.operatorName || null,
            signalStatus: slot.signalStatus || null
          }));

        // Find phone numbers to remove (exist in DB but not in new SIM slots)
        const phoneNumbersToRemove = currentPhoneNumbers.filter(dbPhone => 
          !newPhoneNumbers.find(newPhone => newPhone.phoneNumber === dbPhone.phoneNumber)
        );

        // Remove old phone numbers
        if (phoneNumbersToRemove.length > 0) {
          await prisma.phoneNumber.deleteMany({
            where: {
              id: { in: phoneNumbersToRemove.map(p => p.id) }
            }
          });
          console.log(`Removed ${phoneNumbersToRemove.length} old phone numbers for device ${deviceId}`);
        }

        // Update or insert new phone numbers
        for (const newPhone of newPhoneNumbers) {
          const existingPhone = currentPhoneNumbers.find(dbPhone => 
            dbPhone.phoneNumber === newPhone.phoneNumber
          );

          if (existingPhone) {
            // Update existing phone number
            await prisma.phoneNumber.update({
              where: { id: existingPhone.id },
              data: {
                slotIndex: newPhone.slotIndex,
                carrierName: newPhone.carrierName,
                operatorName: newPhone.operatorName,
                signalStatus: newPhone.signalStatus
              }
            });
            console.log(`Updated phone number ${newPhone.phoneNumber} for slot ${newPhone.slotIndex}`);
          } else {
            // Insert new phone number
            await prisma.phoneNumber.create({
              data: {
                deviceId: device.id,
                ...newPhone
              }
            });
            console.log(`Added new phone number ${newPhone.phoneNumber} for slot ${newPhone.slotIndex}`);
          }
        }

        // Log the update
        const validPhoneNumbers = newPhoneNumbers.map(p => p.phoneNumber);
        const phoneNumberDisplay = validPhoneNumbers.length > 0 
          ? validPhoneNumbers.join(', ') 
          : 'No valid SIMs';
        console.log(`Device ${deviceId} SIM info updated: ${phoneNumberDisplay}`);

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
        const updatedDevice = await prisma.device.findUnique({
          where: { deviceId: deviceId },
          include: {
            phoneNumbers: true
          }
        });

        if (updatedDevice) {
          const deviceData = {
            deviceId: updatedDevice.deviceId,
            batteryLevel: updatedDevice.batteryLevel,
            deviceStatus: updatedDevice.deviceStatus,
            lastSeen: updatedDevice.lastSeen,
            simSlots: updatedDevice.simSlots,
            phoneNumbers: updatedDevice.phoneNumbers,
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
          const totalDevices = await prisma.device.count();
          const onlineDevices = await prisma.device.count({
            where: { deviceStatus: 'online' }
          });
          
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
