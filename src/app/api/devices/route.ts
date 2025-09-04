import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all devices from Supabase
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('last_seen', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
    
    // Transform the data to match the expected format - use stored device_status for instant updates
    const deviceList = data.map((row: any) => {
      return {
        deviceId: row.device_id,
        phoneNumber: row.phone_number,
        simSlots: row.sim_slots ? JSON.parse(row.sim_slots) : row.sim_slots,
        batteryLevel: row.battery_level,
        deviceStatus: row.device_status, // Use stored status for instant updates
        lastSeen: new Date(row.last_seen),
        registeredAt: new Date(row.registered_at),
        isOnline: row.device_status === 'online' // Direct check based on stored status
      };
    });
    
    return NextResponse.json({ devices: deviceList });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve devices' }, { status: 500 });
  }
}
