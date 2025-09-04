import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, timestamp } = body;

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Must be 10 digits' },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('phone_numbers')
      .insert([
        {
          phone_number: phoneNumber,
          timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save phone number' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Phone number saved successfully', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch phone numbers' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
