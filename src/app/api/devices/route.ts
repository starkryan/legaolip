import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Device, PhoneNumber } from '@/models';

export async function GET() {
  try {
    // Ensure database connection
    await connectDB();

    // Fetch all devices from database with phone numbers
    const devices = await Device.find({})
      .sort({ lastSeen: -1 })
      .lean(); // Use lean for better performance

    // Automatic offline detection - mark devices as offline if lastSeen is older than 5 minutes
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = new Date();

    for (const device of devices) {
      const timeDiff = now.getTime() - new Date(device.lastSeen).getTime();

      if (device.deviceStatus === 'online' && timeDiff > offlineThreshold) {
        // Device hasn't sent heartbeat in more than 5 minutes, mark as offline
        await Device.updateOne(
          { _id: device._id },
          { deviceStatus: 'offline' }
        );

        console.log(`Device ${device.deviceId} marked as offline due to inactivity`);
        device.deviceStatus = 'offline';
      }
    }

    // Fetch phone numbers for all devices
    const deviceIds = devices.map(d => d._id);
    const phoneNumbers = await PhoneNumber.find({
      deviceId: { $in: deviceIds }
    }).lean();

    // Group phone numbers by device
    const phoneNumbersByDevice = phoneNumbers.reduce((acc, pn) => {
      const deviceId = pn.deviceId.toString();
      if (!acc[deviceId]) {
        acc[deviceId] = [];
      }
      acc[deviceId].push(pn);
      return acc;
    }, {} as Record<string, any[]>);

    // Transform the data to match the expected format
    const deviceList = devices.map((device: any) => {
      const devicePhoneNumbers = phoneNumbersByDevice[device._id.toString()] || [];

      // Extract phone numbers
      const phoneNumbers = devicePhoneNumbers
        .map((pn: any) => pn.phoneNumber)
        .filter((pn: string) => pn && pn.trim() !== '');
      const combinedPhoneNumbers = phoneNumbers.length > 0 ? phoneNumbers.join(', ') : '';

      // Create SIM slots data from phoneNumbers
      const simSlotsData = devicePhoneNumbers.map((pn: any) => ({
        slotIndex: pn.slotIndex || 0,
        carrierName: pn.carrierName || 'Unknown',
        phoneNumber: pn.phoneNumber || '',
        operatorName: pn.operatorName || undefined,
        signalStatus: pn.signalStatus || undefined
      }));

      return {
        deviceId: device.deviceId,
        phoneNumber: combinedPhoneNumbers,
        simSlots: simSlotsData,
        batteryLevel: device.batteryLevel,
        deviceStatus: device.deviceStatus,
        lastSeen: device.lastSeen,
        registeredAt: device.registeredAt,
        isOnline: device.deviceStatus === 'online'
      };
    });

    return NextResponse.json({ devices: deviceList });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve devices' }, { status: 500 });
  }
}
