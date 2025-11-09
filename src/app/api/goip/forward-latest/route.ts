import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getConnectionStatus } from '@/lib/db';
import { SmsMessage, Device } from '@/models';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: any = {};

    // Parse the request body
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        // If not JSON, try to parse as form data
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params);
      }
    }

    // Get URL from query parameters
    const { searchParams } = new URL(req.url);
    const forwardingUrl = body.forwardingUrl || body.url || searchParams.get('url') || searchParams.get('forwardingUrl') || '';

    // Check database connection
    const connectionStatus = getConnectionStatus();
    if (!connectionStatus.isConnected) {
      await connectDB();
    }

    // Get the most recent SMS message
    const latestSms = await SmsMessage.findOne()
      .sort({ receivedAt: -1 })
      .populate({
        path: 'deviceId',
        model: Device,
        select: 'deviceId name'
      });

    if (!latestSms) {
      return NextResponse.json(
        { error: 'No SMS messages found to forward' },
        { status: 404 }
      );
    }

    // Format the SMS data for forwarding
    const smsData = {
      id: latestSms._id.toString(),
      deviceId: latestSms.deviceId?._id?.toString() || latestSms.deviceId?.toString(),
      deviceName: latestSms.deviceId?.name || 'Unknown Device',
      sender: latestSms.sender,
      recipient: latestSms.recipient,
      message: latestSms.message,
      timestamp: latestSms.receivedAt || latestSms.timestamp || latestSms.createdAt,
      status: latestSms.status,
      createdAt: latestSms.createdAt,
      updatedAt: latestSms.updatedAt,
      slotIndex: latestSms.slotIndex || 0,
      charset: 'UTF-8'
    };

    // Log the SMS details
    console.log('\n📤 Latest SMS Forward Request:');
    console.log('================================');
    console.log(`📱 Device ID: ${smsData.deviceId}`);
    console.log(`📛 Device Name: ${smsData.deviceName}`);
    console.log(`📨 Sender: ${smsData.sender}`);
    console.log(`📥 Recipient: ${smsData.recipient}`);
    console.log(`💬 Message: ${smsData.message}`);
    console.log(`🕰️ Timestamp: ${smsData.timestamp}`);
    console.log(`📊 Status: ${smsData.status}`);
    console.log(`🔤 Charset: ${smsData.charset}`);

    // If forwarding URL is provided, forward the SMS
    if (forwardingUrl) {
      console.log(`🔗 Forwarding URL: ${forwardingUrl}`);
      console.log('================================\n');

      try {
        const response = await fetch(forwardingUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'User-Agent': 'GOIP-SMS-Forwarder/1.0'
          },
          body: JSON.stringify(smsData, null, 2),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        const responseText = await response.text();
        console.log(`📨 Forwarding Response Status: ${response.status}`);
        console.log(`📨 Forwarding Response Body: ${responseText}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return NextResponse.json({
          success: true,
          message: 'Latest SMS forwarded successfully',
          forwardedTo: forwardingUrl,
          smsData: {
            id: smsData.id,
            sender: smsData.sender,
            recipient: smsData.recipient,
            message: smsData.message,
            timestamp: smsData.timestamp
          },
          forwardingResponse: {
            status: response.status,
            statusText: response.statusText,
            body: responseText
          }
        });

      } catch (forwardingError) {
        console.error('❌ Forwarding failed:', forwardingError);
        return NextResponse.json({
          success: false,
          error: 'Failed to forward SMS',
          details: forwardingError instanceof Error ? forwardingError.message : 'Unknown error',
          smsData: {
            id: smsData.id,
            sender: smsData.sender,
            recipient: smsData.recipient,
            message: smsData.message
          }
        }, { status: 500 });
      }
    } else {
      // No forwarding URL - just return the latest SMS
      console.log('📄 Returning latest SMS (no forwarding URL provided)');
      console.log('================================\n');

      return NextResponse.json({
        success: true,
        message: 'Latest SMS retrieved successfully',
        smsData: {
          id: smsData.id,
          deviceId: smsData.deviceId,
          deviceName: smsData.deviceName,
          sender: smsData.sender,
          recipient: smsData.recipient,
          message: smsData.message,
          timestamp: smsData.timestamp,
          status: smsData.status,
          charset: smsData.charset
        },
        action: 'retrieved'
      });
    }

  } catch (error) {
    console.error('❌ Error in forward-latest endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support GET method to just retrieve latest SMS info
export async function GET(req: Request) {
  try {
    // Check database connection
    const connectionStatus = getConnectionStatus();
    if (!connectionStatus.isConnected) {
      await connectDB();
    }

    // Get the most recent SMS message
    const latestSms = await SmsMessage.findOne()
      .sort({ receivedAt: -1 })
      .populate({
        path: 'deviceId',
        model: Device,
        select: 'deviceId name'
      });

    if (!latestSms) {
      return NextResponse.json(
        { error: 'No SMS messages found' },
        { status: 404 }
      );
    }

    const smsData = {
      id: latestSms._id.toString(),
      deviceId: latestSms.deviceId?._id?.toString() || latestSms.deviceId?.toString(),
      deviceName: latestSms.deviceId?.name || 'Unknown Device',
      sender: latestSms.sender,
      recipient: latestSms.recipient,
      message: latestSms.message,
      timestamp: latestSms.receivedAt || latestSms.timestamp || latestSms.createdAt,
      status: latestSms.status,
      createdAt: latestSms.createdAt,
      updatedAt: latestSms.updatedAt,
      slotIndex: latestSms.slotIndex || 0,
      charset: 'UTF-8'
    };

    console.log('\n📄 Latest SMS Info (GET request):');
    console.log('==================================');
    console.log(`📱 Device: ${smsData.deviceName} (${smsData.deviceId})`);
    console.log(`📨 From: ${smsData.sender}`);
    console.log(`📥 To: ${smsData.recipient}`);
    console.log(`💬 Message: ${smsData.message}`);
    console.log(`🕰️ Time: ${smsData.timestamp}`);
    console.log('==================================\n');

    return NextResponse.json({
      success: true,
      smsData,
      charset: 'UTF-8',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in GET forward-latest:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}