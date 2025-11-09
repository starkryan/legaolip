import { NextResponse } from 'next/server';
import { parseAndForwardSMS, batchForwardSMS, getSMSStats, parseSMSWithDeviceContext } from '@/utils/sms-parser';
import { connectDB } from '@/lib/db';
import { SmsMessage, Device, PhoneNumber } from '@/models';
import { parsePortNumber } from '@/utils/skyline-transformer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    let raw: string;
    const contentType = req.headers.get('content-type') || '';

    // Handle different content types
    if (contentType.includes('application/json')) {
      const jsonData = await req.json();
      raw = jsonData.message || jsonData.raw || jsonData.data || JSON.stringify(jsonData);
    } else {
      // Handle raw text data
      raw = await req.text();
    }

    console.log('\n📦 Incoming SMS forwarding request');
    console.log('Content-Type:', contentType);
    console.log('Raw data length:', raw.length);

    if (!raw || raw.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No SMS data provided'
        },
        { status: 400 }
      );
    }

    // Check if this is a batch request (multiple messages separated by delimiter)
    const messages = raw.split('---MESSAGE-DELIMITER---').filter(msg => msg.trim().length > 0);

    let result;
    if (messages.length > 1) {
      // Batch processing
      console.log(`🔄 Processing batch of ${messages.length} messages`);
      const results = await batchForwardSMS(messages);
      const stats = getSMSStats(results);

      console.log(`✅ Batch processing complete: ${stats.successful}/${stats.total} successful`);

      result = {
        success: stats.successful > 0,
        batch: true,
        stats: stats,
        results: results
      };
    } else {
      // Single message processing
      result = await parseAndForwardSMS(raw);
    }

    // Log the result
    if (result.success) {
      console.log(`✅ SMS forwarded successfully - Port: ${result.port}, Message ID: ${result.messageId}`);
    } else {
      console.log(`❌ SMS forwarding failed - Port: ${result.port}, Error: ${result.error}`);
    }

    // Store the SMS in our local database as well for tracking
    if (result.success && !('batch' in result && result.batch)) {
      try {
        await connectDB();
        const parsedSMS = await parseSMSWithDeviceContext(raw);
        if (parsedSMS) {
          let device = null;

          // Try to find device by device context first (for device-specific ports)
          if (parsedSMS.deviceContext) {
            device = await Device.findOne({ deviceId: parsedSMS.deviceContext.deviceId }).populate('phoneNumbers').lean();
          }

          // Fallback: try to find device by port parsing (for backward compatibility)
          if (!device && parsedSMS.port) {
            const portInfo = parsePortNumber(parsedSMS.port);
            if (portInfo) {
              device = await Device.findOne({ deviceId: portInfo.deviceId }).populate('phoneNumbers').lean();
            }
          }

          // Final fallback: create a dummy device for tracking purposes
          if (!device) {
            const deviceId = parsedSMS.deviceContext?.deviceId ||
                           (parsePortNumber(parsedSMS.port)?.deviceId) ||
                           `skyline-gateway-${parsedSMS.port}`;

            device = await Device.create({
              deviceId: deviceId,
              phoneNumber: parsedSMS.receiver,
              deviceStatus: 'online',
              batteryLevel: 100,
              lastSeen: new Date(),
              simSlots: []
            });

            // Add phone number entry
            const slotIndex = parsedSMS.deviceContext?.slotIndex ||
                            (parsePortNumber(parsedSMS.port)?.slotIndex) ||
                            (parseInt(parsedSMS.port) - 1) || 0;

            await PhoneNumber.create({
              deviceId: device._id,
              phoneNumber: parsedSMS.receiver,
              slotIndex: slotIndex,
              carrierName: 'Unknown'
            });

            console.log(`📱 Created new device entry: ${device.deviceId}`);
          }

          // Store SMS message in local database
          const slotIndex = parsedSMS.deviceContext?.slotIndex ||
                          (parsePortNumber(parsedSMS.port)?.slotIndex) ||
                          (parseInt(parsedSMS.port) - 1) || 0;

          await SmsMessage.create({
            deviceId: device._id,
            sender: parsedSMS.sender,
            recipient: parsedSMS.receiver,
            message: parsedSMS.message,
            timestamp: parsedSMS.time,
            receivedAt: new Date(),
            slotIndex: slotIndex
          });

          console.log(`📝 SMS also stored in local database for device: ${device.deviceId} (slot ${slotIndex + 1})`);
        }
      } catch (dbError) {
        console.warn('⚠️ Failed to store SMS in local database:', dbError instanceof Error ? dbError.message : 'Unknown error');
        // Don't fail the request if local storage fails
      }
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? (('batch' in result && result.batch)
          ? `Processed ${result.stats.total} messages with ${result.stats.successful} successes`
          : 'SMS forwarded successfully')
        : 'SMS forwarding failed',
      data: result,
      timestamp: new Date().toISOString()
    }, {
      status: result.success ? 200 : 400
    });

  } catch (error) {
    console.error('❌ SMS forwarding endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process SMS forwarding request',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    // Ensure database connection
    await connectDB();

    // Get recent forwarding statistics
    const recentMessages = await SmsMessage.find({
      receivedAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    })
    .sort({ receivedAt: -1 })
    .limit(100)
    .populate({
      path: 'deviceId',
      model: 'Device',
      select: 'deviceId'
    })
    .lean();

    return NextResponse.json({
      success: true,
      stats: {
        totalMessages: recentMessages.length,
        uniqueDevices: new Set(recentMessages.map((m: any) => (m.deviceId as any)?.deviceId).filter(Boolean)).size,
        timeRange: 'Last 24 hours'
      },
      recentMessages: recentMessages.map((msg: any) => {
        const device = msg.deviceId as any;
        return {
          id: msg._id,
          deviceId: device?.deviceId,
          sender: msg.sender,
          recipient: msg.recipient,
          message: msg.message,
          timestamp: msg.timestamp,
          port: device && msg.slotIndex !== null ?
            `${device.deviceId}-${msg.slotIndex + 1}.01` :
            (msg.slotIndex ? `${msg.slotIndex + 1}.01` : 'Unknown')
        };
      })
    });
  } catch (error) {
    console.error('❌ SMS forwarding stats endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve SMS forwarding statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add support for OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}