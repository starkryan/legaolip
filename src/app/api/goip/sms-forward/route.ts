import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // TODO: Implement SMS forwarding logic
    console.log('SMS forward request:', body);

    return NextResponse.json({
      success: true,
      message: 'SMS forward endpoint is not yet implemented'
    });
  } catch (error) {
    console.error('Error in SMS forward:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'SMS forward endpoint'
  });
}