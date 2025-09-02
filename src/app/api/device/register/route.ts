import { NextResponse } from 'next/server';
import { supabase, Device } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, phoneNumber, simSlots, batteryLevel, deviceStatus } = body;
    
    // Validate required fields
    if (!deviceId || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: deviceId and phoneNumber are required' },
        { status: 400 }
      );
    }
    
    const device: Device = {
      deviceId,
      phoneNumber,
      simSlots,
      batteryLevel,
      deviceStatus,
      lastSeen: new Date(),
      registeredAt: new Date()
    };
    
    // Handle simSlots conversion safely
    let simSlotsString: string;
    try {
      simSlotsString = typeof device.simSlots === 'string' 
        ? device.simSlots 
        : JSON.stringify(device.simSlots || []);
    } catch (jsonError) {
      console.error('JSON stringify error:', jsonError);
      simSlotsString = '[]';
    }
    
    // Insert or update device in Supabase
    const { data, error } = await supabase
      .from('devices')
      .upsert({
        device_id: device.deviceId,
        phone_number: device.phoneNumber,
        sim_slots: simSlotsString,
        battery_level: device.batteryLevel,
        device_status: device.deviceStatus || 'online',
        last_seen: device.lastSeen.toISOString(),
        registered_at: device.registeredAt.toISOString()
      })
      .select();
    
    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { success: false, error: 'Database error', details: error.message },
        { status: 500 }
      );
    }
    
    console.log(`Device registered: ${deviceId} - ${phoneNumber}`);
    
    return NextResponse.json({ success: true, message: 'Device registered successfully' });
  } catch (error) {
    console.error('Registration endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body', details: String(error) },
      { status: 400 }
    );
  }
}
