import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SmsForwardingConfig } from '@/models';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const config = await SmsForwardingConfig.findById(id);

    if (!config) {
      return NextResponse.json({
        success: false,
        message: 'Forwarding configuration not found'
      }, { status: 404 });
    }

    // Create test SMS data
    const testSmsData = {
      id: 'test-' + Date.now(),
      deviceId: 'test-device',
      deviceIdStr: 'test-device',
      sender: '+1234567890',
      recipient: '+0987654321',
      message: 'This is a test SMS message for webhook testing.',
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      slotIndex: 0,
      carrierName: 'Test Carrier',
      slotInfo: {
        slotIndex: 0,
        carrierName: 'Test Carrier',
        phoneNumber: '+0987654321'
      },
      test: true
    };

    // Test the webhook
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (config as any).timeout * 1000);

    try {
      const response = await fetch((config as any).url, {
        method: 'POST',
        headers: Object.fromEntries((config as any).headers || new Map()),
        body: JSON.stringify(testSmsData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();

      // Update statistics
      if (response.ok) {
        await SmsForwardingConfig.findByIdAndUpdate(id, {
          $inc: { successCount: 1 },
          lastUsed: new Date()
        });
      } else {
        await SmsForwardingConfig.findByIdAndUpdate(id, {
          $inc: { failureCount: 1 },
          lastUsed: new Date()
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Test completed',
        response: {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        },
        testSmsData
      });

    } catch (webhookError) {
      clearTimeout(timeoutId);

      // Update failure statistics
      await SmsForwardingConfig.findByIdAndUpdate(id, {
        $inc: { failureCount: 1 },
        lastUsed: new Date()
      });

      return NextResponse.json({
        success: false,
        message: 'Webhook test failed',
        error: webhookError instanceof Error ? webhookError.message : 'Unknown error',
        testSmsData
      });
    }

  } catch (error) {
    console.error('Error testing forwarding config:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to test forwarding configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}