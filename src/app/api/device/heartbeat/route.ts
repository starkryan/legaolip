import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, batteryLevel, deviceStatus } = body;
    
    // Update device heartbeat in Supabase
    const { data, error } = await supabase
      .from('devices')
      .update({
        battery_level: batteryLevel,
        device_status: deviceStatus,
        last_seen: new Date().toISOString()
      })
      .eq('device_id', deviceId)
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
    
    // If no rows were updated, the device might not exist
    if (data && data.length === 0) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

// Yes mofo this will sent a heartbeat