import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(
  request: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params;
    
    // Delete device from Supabase
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('device_id', deviceId);
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
    
    console.log(`Device deleted: ${deviceId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
