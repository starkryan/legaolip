import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SmsForwardingConfig } from '@/models';

// POST - Test a forwarding configuration
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { testMessage = 'Test message from GOIP SMS Forwarder' } = body;

    await connectDB();

    const config = await SmsForwardingConfig.findById(id);

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Forwarding configuration not found'
      }, { status: 404 });
    }

    if (!config.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Forwarding configuration is not active'
      }, { status: 400 });
    }

    // Prepare test payload
    const testPayload = {
      id: `test_${Date.now()}`,
      deviceId: 'test-device',
      sender: '+1234567890',
      recipient: '+0987654321',
      message: testMessage,
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      slotIndex: 0,
      carrierName: 'Test Carrier',
      test: true
    };

    // Make test request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout * 1000);

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: Object.fromEntries(config.headers),
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Update statistics
      if (response.ok) {
        await SmsForwardingConfig.findByIdAndUpdate(id, {
          $inc: { successCount: 1 },
          lastUsed: new Date()
        });

        console.log(`✅ Test successful for config: ${config.name}`);

        return NextResponse.json({
          success: true,
          message: 'Test sent successfully',
          response: {
            status: response.status,
            statusText: response.statusText
          },
          payload: testPayload
        });
      } else {
        await SmsForwardingConfig.findByIdAndUpdate(id, {
          $inc: { failureCount: 1 },
          lastUsed: new Date()
        });

        const errorText = await response.text();
        console.error(`❌ Test failed for config ${config.name}:`, errorText);

        return NextResponse.json({
          success: false,
          message: 'Test request failed',
          response: {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          }
        });
      }
    } catch (error) {
      clearTimeout(timeoutId);

      await SmsForwardingConfig.findByIdAndUpdate(id, {
        $inc: { failureCount: 1 },
        lastUsed: new Date()
      });

      console.error(`❌ Test error for config ${config.name}:`, error);

      return NextResponse.json({
        success: false,
        message: 'Test request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error testing forwarding config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test forwarding configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}