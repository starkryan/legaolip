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

    // Automatic offline detection - mark devices as offline if lastSeen is older than 2 minutes
    const offlineThreshold = 2 * 60 * 1000; // 2 minutes in milliseconds
    const now = new Date();

    for (const device of devices) {
      const timeDiff = now.getTime() - new Date(device.lastSeen).getTime();

      if (timeDiff > offlineThreshold && device.deviceStatus === 'online') {
        // Device hasn't sent heartbeat in more than 2 minutes, mark as offline
        await Device.updateOne(
          { _id: device._id },
          { deviceStatus: 'offline' }
        );
        device.deviceStatus = 'offline';
      } else if (timeDiff <= offlineThreshold && device.deviceStatus === 'offline') {
        // Device sent recent heartbeat but is marked as offline, mark as online
        await Device.updateOne(
          { _id: device._id },
          { deviceStatus: 'online' }
        );
        device.deviceStatus = 'online';
      }
    }

    // Fetch phone numbers for all devices
    const deviceIds = devices.map((d: any) => d._id);
    const phoneNumbers = await PhoneNumber.find({
      deviceId: { $in: deviceIds }
    }).lean();

    // Group phone numbers by device
    const phoneNumbersByDevice = phoneNumbers.reduce((acc: any, pn: any) => {
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

      // Calculate actual online status based on lastSeen time
      const timeDiff = now.getTime() - new Date(device.lastSeen).getTime();
      const actuallyOnline = timeDiff <= offlineThreshold;

      return {
        _id: device._id.toString(),
        deviceId: device.deviceId,
        phoneNumber: combinedPhoneNumbers,
        simSlots: simSlotsData,
        batteryLevel: device.batteryLevel,
        deviceStatus: device.deviceStatus,
        lastSeen: device.lastSeen,
        registeredAt: device.registeredAt,
        deviceBrandInfo: device.deviceBrandInfo, // Add device brand information
        isOnline: actuallyOnline
      };
    });

    console.log(`Returning ${deviceList.length} devices`);

    return NextResponse.json({ devices: deviceList });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve devices' }, { status: 500 });
  }
}
