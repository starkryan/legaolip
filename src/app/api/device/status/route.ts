import { NextResponse } from 'next/server';
import { supabase, getDeviceStatus } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId query parameter is required' },
        { status: 400 }
      );
    }
    
    // Fetch device from Supabase
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', deviceId)
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }
    
    // Determine online/offline status
    const statusInfo = getDeviceStatus(data.last_seen);
    
    const deviceWithStatus = {
      deviceId: data.device_id,
      phoneNumber: data.phone_number,
      simSlots: data.sim_slots ? JSON.parse(data.sim_slots) : data.sim_slots,
      batteryLevel: data.battery_level,
      deviceStatus: statusInfo.status,
      lastSeen: statusInfo.lastSeen,
      registeredAt: new Date(data.registered_at),
      calculatedStatus: statusInfo.status
    };
    
    return NextResponse.json({ success: true, device: deviceWithStatus });
  } catch (error) {
    console.error('Status endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve device status' },
      { status: 500 }
    );
  }
}
