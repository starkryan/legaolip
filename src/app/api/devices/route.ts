import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all devices from database
    const devices = await prisma.device.findMany({
      orderBy: {
        lastSeen: 'desc'
      },
      include: {
        phoneNumbers: true
      }
    });
    
    // Automatic offline detection - mark devices as offline if lastSeen is older than 5 minutes
    const now = new Date();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    for (const device of devices) {
      const timeDiff = now.getTime() - device.lastSeen.getTime();
      
      if (device.deviceStatus === 'online' && timeDiff > offlineThreshold) {
        // Device hasn't sent heartbeat in more than 5 minutes, mark as offline
        await prisma.device.update({
          where: { id: device.id },
          data: { deviceStatus: 'offline' }
        });
        
        console.log(`Device ${device.deviceId} marked as offline due to inactivity`);
        device.deviceStatus = 'offline';
      }
    }
    
    // Transform the data to match the expected format
    const deviceList = devices.map((device: any) => {
      // Extract phone numbers from the phoneNumbers relationship instead of the phoneNumber field
      const phoneNumbers = device.phoneNumbers.map((pn: any) => pn.phoneNumber).filter((pn: string) => pn && pn.trim() !== '');
      const combinedPhoneNumbers = phoneNumbers.length > 0 ? phoneNumbers.join(', ') : '';
      
      // Create SIM slots data from phoneNumbers table if simSlots is not available or is just a number
      let simSlotsData = device.simSlots;
      
      // If simSlots is not an array or is just a number, create it from phoneNumbers
      if (!Array.isArray(simSlotsData) || typeof simSlotsData === 'number') {
        simSlotsData = device.phoneNumbers.map((pn: any) => ({
          slotIndex: pn.slotIndex || 0,
          carrierName: pn.carrierName || 'Unknown',
          phoneNumber: pn.phoneNumber || '',
          operatorName: pn.operatorName || undefined,
          signalStatus: pn.signalStatus || undefined
        }));
      }
      
      return {
        deviceId: device.deviceId,
        phoneNumber: combinedPhoneNumbers, // Use combined phone numbers from phoneNumbers table
        simSlots: simSlotsData, // Use the enhanced SIM slots data with signal information
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
