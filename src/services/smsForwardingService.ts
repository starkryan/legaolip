import { connectDB } from '@/lib/db';
import { SmsForwardingConfig } from '@/models';
import { SmsMessage } from '@/models';

// SMS message payload for forwarding
interface SmsForwardPayload {
  id: string;
  deviceId: string;
  deviceIdStr?: string;
  sender: string;
  recipient: string;
  message: string;
  timestamp: string;
  receivedAt: string;
  slotIndex?: number;
  carrierName?: string;
  slotInfo?: any;
  test?: boolean;
}

// Forward SMS message to all configured URLs
export async function forwardSms(smsData: any, deviceInfo?: any): Promise<void> {
  try {
    await connectDB();

    // Find active forwarding configurations
    const configs = await SmsForwardingConfig.find({ isActive: true });

    if (configs.length === 0) {
      console.log('ℹ️ No active SMS forwarding configurations found');
      return;
    }

    // Filter configs based on device/phone number restrictions
    const applicableConfigs = configs.filter(config => {
      // Check device ID restrictions
      if (config.deviceIds && config.deviceIds.length > 0) {
        if (!config.deviceIds.includes(smsData.deviceId)) {
          return false;
        }
      }

      // Check phone number restrictions
      if (config.phoneNumbers && config.phoneNumbers.length > 0) {
        if (!config.phoneNumbers.includes(smsData.recipient)) {
          return false;
        }
      }

      return true;
    });

    if (applicableConfigs.length === 0) {
      console.log('ℹ️ No applicable forwarding configurations for this SMS');
      return;
    }

    console.log(`📤 Forwarding SMS to ${applicableConfigs.length} configurations`);

    // Prepare payload for each config
    const payload: SmsForwardPayload = {
      id: smsData._id || smsData.id,
      deviceId: smsData.deviceId,
      deviceIdStr: deviceInfo?.deviceId || smsData.deviceId,
      sender: smsData.sender,
      recipient: smsData.recipient,
      message: smsData.message,
      timestamp: smsData.timestamp,
      receivedAt: smsData.receivedAt || new Date().toISOString(),
      slotIndex: smsData.slotIndex,
      carrierName: smsData.carrierName,
      slotInfo: smsData.slotInfo
    };

    // Forward to each configuration
    const forwardPromises = applicableConfigs.map(config =>
      forwardToSingleConfig(config, payload, smsData)
    );

    // Wait for all forwards to complete (but don't fail the SMS if forwarding fails)
    const results = await Promise.allSettled(forwardPromises);

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (successful > 0) {
      console.log(`✅ Successfully forwarded to ${successful} configuration(s)`);
    }

    if (failed > 0) {
      console.warn(`⚠️ Failed to forward to ${failed} configuration(s)`);
    }

  } catch (error) {
    console.error('Error in SMS forwarding service:', error);
  }
}

// Forward SMS to a single configuration with retry logic
async function forwardToSingleConfig(
  config: any,
  payload: SmsForwardPayload,
  originalSmsData: any
): Promise<{ status: 'fulfilled' | 'rejected', configName: string }> {
  const configName = config.name;
  let attempt = 0;
  const maxAttempts = config.retryCount + 1;

  while (attempt < maxAttempts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout * 1000);

      const response = await fetch(config.url, {
        method: 'POST',
        headers: Object.fromEntries(config.headers),
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Update success statistics
        await SmsForwardingConfig.findByIdAndUpdate(config._id, {
          $inc: { successCount: 1 },
          lastUsed: new Date()
        });

        console.log(`✅ SMS forwarded successfully to: ${configName} (${response.status})`);
        return { status: 'fulfilled', configName };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      attempt++;

      if (attempt < maxAttempts) {
        const delay = config.retryDelay * 1000;
        console.log(`⏳ Forwarding attempt ${attempt} failed for ${configName}, retrying in ${config.retryDelay}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Update failure statistics
        await SmsForwardingConfig.findByIdAndUpdate(config._id, {
          $inc: { failureCount: 1 },
          lastUsed: new Date()
        });

        console.error(`❌ SMS forwarding failed for ${configName} after ${maxAttempts} attempts:`, error);
        return { status: 'rejected', configName };
      }
    }
  }

  return { status: 'rejected', configName };
}

// Get forwarding statistics
export async function getForwardingStats() {
  try {
    await connectDB();

    const totalConfigs = await SmsForwardingConfig.countDocuments();
    const activeConfigs = await SmsForwardingConfig.countDocuments({ isActive: true });

    // Aggregate success/failure counts
    const successStats = await SmsForwardingConfig.aggregate([
      {
        $group: {
          _id: null,
          totalSuccesses: { $sum: '$successCount' },
          totalFailures: { $sum: '$failureCount' }
        }
      }
    ]);

    const result = successStats[0] || { totalSuccesses: 0, totalFailures: 0 };

    return {
      totalConfigs,
      activeConfigs,
      totalSuccesses: result.totalSuccesses || 0,
      totalFailures: result.totalFailures || 0,
      successRate: result.totalSuccesses && result.totalFailures
        ? ((result.totalSuccesses / (result.totalSuccesses + result.totalFailures)) * 100).toFixed(1)
        : '0.0'
    };
  } catch (error) {
    console.error('Error getting forwarding stats:', error);
    return {
      totalConfigs: 0,
      activeConfigs: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      successRate: '0.0'
    };
  }
}