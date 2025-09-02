import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, sender, message, timestamp, recipient } = body;
    
    // Insert SMS message into Supabase
    const { data, error } = await supabase
      .from('sms_messages')
      .insert({
        device_id: deviceId,
        sender: sender,
        message: message,
        recipient: recipient,
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
        received_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
    
    console.log(`SMS received from ${sender}: ${message}`);
    
    return NextResponse.json({ success: true, messageId: data[0].id });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
