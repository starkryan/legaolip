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
    
    // Automatic offline detection - mark devices as offline if last_seen is older than 5 minutes
    const now = new Date();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    for (const row of data) {
      const lastSeen = new Date(row.last_seen);
      const timeDiff = now.getTime() - lastSeen.getTime();
      
      if (row.device_status === 'online' && timeDiff > offlineThreshold) {
        // Device hasn't sent heartbeat in more than 5 minutes, mark as offline
        const { error: updateError } = await supabase
          .from('devices')
          .update({ device_status: 'offline' })
          .eq('device_id', row.device_id);
        
        if (updateError) {
          console.error('Error updating device status to offline:', updateError);
        } else {
          console.log(`Device ${row.device_id} marked as offline due to inactivity`);
          // Update the row data for the current response
          row.device_status = 'offline';
        }
      }
    }
    
    // Transform the data to match the expected format
    const deviceList = data.map((row: any) => {
      return {
        deviceId: row.device_id,
        phoneNumber: row.phone_number,
        simSlots: row.sim_slots ? JSON.parse(row.sim_slots) : row.sim_slots,
        batteryLevel: row.battery_level,
        deviceStatus: row.device_status,
        lastSeen: new Date(row.last_seen),
        registeredAt: new Date(row.registered_at),
        isOnline: row.device_status === 'online'
      };
    });
    
    return NextResponse.json({ devices: deviceList });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve devices' }, { status: 500 });
  }
}
