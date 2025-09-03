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
    
    // First try to update the device if it exists
    const { data: updateData, error: updateError } = await supabase
      .from('devices')
      .update({
        phone_number: device.phoneNumber,
        sim_slots: simSlotsString,
        battery_level: device.batteryLevel,
        device_status: device.deviceStatus || 'online',
        last_seen: device.lastSeen.toISOString()
      })
      .eq('device_id', device.deviceId)
      .select();
    
    let data = updateData;
    let error = updateError;
    
    // If update didn't find any rows (device doesn't exist), insert new device
    if (!error && updateData && updateData.length === 0) {
      const { data: insertData, error: insertError } = await supabase
        .from('devices')
        .insert({
          device_id: device.deviceId,
          phone_number: device.phoneNumber,
          sim_slots: simSlotsString,
          battery_level: device.batteryLevel,
          device_status: device.deviceStatus || 'online',
          last_seen: device.lastSeen.toISOString(),
          registered_at: device.registeredAt.toISOString()
        })
        .select();
      
      data = insertData;
      error = insertError;
    }
    
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
