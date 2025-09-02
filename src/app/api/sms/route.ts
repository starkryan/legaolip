import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all SMS messages from Supabase
    const { data, error } = await supabase
      .from('sms_messages')
      .select('*')
      .order('received_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }
    
    // Transform the data to match the expected format
    const messages = data.map((row: any) => ({
      id: row.id,
      deviceId: row.device_id,
      sender: row.sender,
      recipient: row.recipient,
      message: row.message,
      timestamp: row.timestamp ? new Date(row.timestamp) : undefined,
      receivedAt: row.received_at ? new Date(row.received_at) : undefined,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      status: row.status
    }));
    
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve SMS messages' }, { status: 500 });
  }
}
