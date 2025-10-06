import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const smsData = await req.json();

    console.log('\n📨 Received forwarded SMS:');
    console.log('============================');
    console.log(`📱 Device: ${smsData.deviceName}`);
    console.log(`📨 From: ${smsData.sender}`);
    console.log(`📥 To: ${smsData.recipient}`);
    console.log(`💬 Message: ${smsData.message}`);
    console.log(`🕰️ Time: ${smsData.timestamp}`);
    console.log(`🔤 Charset: ${smsData.charset}`);
    console.log('============================\n');

    return NextResponse.json({
      success: true,
      message: 'SMS received successfully',
      receivedAt: new Date().toISOString(),
      smsData: {
        id: smsData.id,
        sender: smsData.sender,
        recipient: smsData.recipient,
        message: smsData.message,
        timestamp: smsData.timestamp,
        charset: smsData.charset
      }
    });

  } catch (error) {
    console.error('❌ Error receiving SMS:', error);
    return NextResponse.json(
      {
        error: 'Failed to process SMS',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}