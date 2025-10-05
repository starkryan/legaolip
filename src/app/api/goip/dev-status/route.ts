import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Device, PhoneNumber } from '@/models';
import { transformDeviceToSkyline, transformDevicesToSkyline } from '@/utils/skyline-transformer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    console.log(`📡 Skyline device status request - DeviceId: ${deviceId || 'All devices'}`);

    // Ensure database connection
    await connectDB();

    if (deviceId) {
      // Return single device in Skyline format
      const device = await Device.findOne({ deviceId }).lean();

      if (!device) {
        console.log(`❌ Device not found: ${deviceId}`);
        return NextResponse.json(
          {
            success: false,
            error: 'Device not found',
            deviceId: deviceId
          },
          { status: 404 }
        );
      }

      // Fetch phone numbers for this device
      const phoneNumbers = await PhoneNumber.find({ deviceId: device._id }).lean();

      const deviceWithPhoneNumbers = {
        ...device,
        phoneNumbers,
        id: device._id.toString()
      };

      const skylineData = transformDeviceToSkyline(deviceWithPhoneNumbers);
      console.log(`✅ Transformed device ${deviceId} to Skyline format with ${skylineData.status.length} ports`);

      return NextResponse.json({
        success: true,
        data: skylineData,
        deviceCount: 1
      });
    } else {
      // Return all devices in Skyline format
      const devices = await Device.find({})
        .sort({ registeredAt: -1 })
        .lean();

      if (devices.length === 0) {
        console.log('⚠️ No devices found in database');
        return NextResponse.json({
          success: true,
          data: [],
          deviceCount: 0,
          message: 'No devices registered'
        });
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

      // Transform devices to include phone numbers
      const devicesWithPhoneNumbers = devices.map((device: any) => ({
        ...device,
        phoneNumbers: phoneNumbersByDevice[device._id.toString()] || [],
        id: device._id.toString()
      }));

      const skylineData = transformDevicesToSkyline(devicesWithPhoneNumbers);
      console.log(`✅ Transformed ${devices.length} devices into single Skyline gateway with ${skylineData.status.length} ports`);

      return NextResponse.json(skylineData);
    }
  } catch (error) {
    console.error('❌ Skyline device status endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve device status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, forceRefresh } = body;

    console.log(`📡 Skyline device status POST request - DeviceId: ${deviceId}, ForceRefresh: ${forceRefresh}`);

    // Ensure database connection
    await connectDB();

    // Similar logic to GET but can include force refresh functionality
    const device = await Device.findOne({ deviceId }).lean();

    if (!device) {
      console.log(`❌ Device not found: ${deviceId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Device not found',
          deviceId: deviceId
        },
        { status: 404 }
      );
    }

    // Update last seen time if force refresh is requested
    if (forceRefresh) {
      await Device.updateOne(
        { _id: device._id },
        { lastSeen: new Date() }
      );
      console.log(`🔄 Updated last seen time for device: ${deviceId}`);
      device.lastSeen = new Date();
    }

    // Fetch phone numbers for this device
    const phoneNumbers = await PhoneNumber.find({ deviceId: device._id }).lean();

    const deviceWithPhoneNumbers = {
      ...device,
      phoneNumbers,
      id: device._id.toString()
    };

    const skylineData = transformDeviceToSkyline(deviceWithPhoneNumbers);
    console.log(`✅ Transformed device ${deviceId} to Skyline format with ${skylineData.status.length} ports`);

    return NextResponse.json({
      success: true,
      data: skylineData,
      deviceCount: 1,
      refreshed: forceRefresh || false
    });
  } catch (error) {
    console.error('❌ Skyline device status POST endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process device status request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add support for OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}