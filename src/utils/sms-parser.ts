import { createMessage } from '@/models/Message';
import { parsePortNumber, findDeviceByPort, findPhoneNumbersByPort } from '@/utils/skyline-transformer';

// Interface for parsed SMS data
export interface ParsedSMS {
  sender: string;
  receiver: string;
  port: string;
  time: Date;
  message: string;
  deviceId?: string;
  slotIndex?: number;
  deviceContext?: {
    deviceId: string;
    slotIndex: number;
    subSlot: string;
  };
}

// Interface for forwarding result
export interface ForwardingResult {
  success: boolean;
  messageId?: string;
  error?: string;
  port?: string;
}

/**
 * Parse SMS data with device context lookup
 * This function resolves device ID and slot information from port numbers
 */
export async function parseSMSWithDeviceContext(rawData: string): Promise<ParsedSMS | null> {
  const baseSMS = parseSMSData(rawData);
  if (!baseSMS) return null;

  // Parse device context from port number
  const portInfo = parsePortNumber(baseSMS.port);
  if (portInfo) {
    baseSMS.deviceId = portInfo.deviceId;
    baseSMS.slotIndex = portInfo.slotIndex;
    baseSMS.deviceContext = {
      deviceId: portInfo.deviceId,
      slotIndex: portInfo.slotIndex,
      subSlot: portInfo.subSlot
    };

    console.log(`📱 Device context resolved: ${portInfo.deviceId} (slot ${portInfo.slotIndex + 1})`);
  } else {
    console.log(`⚠️  Could not parse device context from port: ${baseSMS.port}`);
  }

  return baseSMS;
}

/**
 * Parse raw SMS data in the format provided by the user
 * Format: multiline text with Sender:, Receiver:, SCTS: fields
 */
export function parseSMSData(rawData: string): ParsedSMS | null {
  try {
    console.log('\n📦 Raw incoming body:\n' + rawData + '\n');

    // Extract sender
    const sender = rawData.match(/Sender:\s*(.*)/)?.[1]?.trim() || 'Unknown';

    // Extract receiver line and parse port and number
    const receiverLine = rawData.match(/Receiver:\s*(.*)/)?.[1]?.trim() || '';
    const port = receiverLine.match(/"([^"]+)"/)?.[1] || 'Unknown';
    let receiver = receiverLine.replace(/"[^"]+"\s*/, '') || 'Unknown';

    // Normalize receiver number - remove '91' prefix if it's a 12-digit number
    const receiverStr = receiver.toString();
    const originalReceiver = receiver;
    if (receiverStr.length === 12 && receiverStr.startsWith('91')) {
      receiver = receiverStr.substring(2);
      console.log(`📞 Normalized receiver: ${originalReceiver} -> ${receiver} (removed 91 prefix from 12-digit number)`);
    } else {
      console.log(`📞 Receiver unchanged: ${receiver} (length: ${receiverStr.length})`);
    }

    // Extract and parse timestamp
    const scts = rawData.match(/SCTS:\s*(\d+)/)?.[1] || '';
    const time = scts
      ? new Date(
          `20${scts.slice(0, 2)}-${scts.slice(2, 4)}-${scts.slice(4, 6)}T${scts.slice(6, 8)}:${scts.slice(8, 10)}:${scts.slice(10, 12)}`
        )
      : new Date();

    // Extract message content - clean and join lines
    const message2 = rawData
      .split('\n')
      .map(l => l.trim())
      .filter(l => l &&
        !l.startsWith('Sender:') &&
        !l.startsWith('Receiver:') &&
        !l.startsWith('SCTS:') &&
        !l.startsWith('SMSC:') &&
        !l.startsWith('Slot:')
      )
      .join(' ');

    // Clean extra spaces
    const message = message2.replace(/\s+/g, ' ').trim();

    console.log('----------------------------------');
    console.log(`🟢 Port    : ${port}`);
    console.log(`📨 Sender  : ${sender}`);
    console.log(`📥 Receiver: ${receiver}`);
    console.log(`🕰️  Time    : ${time.toISOString()}`);
    console.log(`💬 Message : ${message}`);
    console.log('----------------------------------');

    return {
      sender,
      receiver,
      port,
      time,
      message
    };
  } catch (error) {
    console.error('❌ Failed to parse SMS:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Forward SMS data to MongoDB
 */
export async function forwardSMS(parsedSMS: ParsedSMS): Promise<ForwardingResult> {
  try {
    const message = await createMessage({
      sender: parsedSMS.sender,
      receiver: parsedSMS.receiver,
      port: parsedSMS.port,
      time: parsedSMS.time,
      message: parsedSMS.message
    });

    console.log(`✅ SMS forwarded successfully to MongoDB. Message ID: ${message._id}`);

    return {
      success: true,
      messageId: message._id?.toString(),
      port: parsedSMS.port
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to forward SMS to MongoDB:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      port: parsedSMS.port
    };
  }
}

/**
 * Parse and forward SMS in one operation with device context
 */
export async function parseAndForwardSMS(rawData: string): Promise<ForwardingResult> {
  const parsedSMS = await parseSMSWithDeviceContext(rawData);

  if (!parsedSMS) {
    return {
      success: false,
      error: 'Failed to parse SMS data'
    };
  }

  return await forwardSMS(parsedSMS);
}

/**
 * Legacy parse and forward SMS function (for backward compatibility)
 */
export async function parseAndForwardSMSLegacy(rawData: string): Promise<ForwardingResult> {
  const parsedSMS = parseSMSData(rawData);

  if (!parsedSMS) {
    return {
      success: false,
      error: 'Failed to parse SMS data'
    };
  }

  return await forwardSMS(parsedSMS);
}

/**
 * Batch process multiple SMS messages
 */
export async function batchForwardSMS(messages: string[]): Promise<ForwardingResult[]> {
  const results: ForwardingResult[] = [];

  for (const message of messages) {
    const result = await parseAndForwardSMS(message);
    results.push(result);

    // Add small delay to prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Validate parsed SMS data
 */
export function validateParsedSMS(parsedSMS: ParsedSMS): boolean {
  return !!(
    parsedSMS.sender &&
    parsedSMS.receiver &&
    parsedSMS.port &&
    parsedSMS.time &&
    parsedSMS.message &&
    parsedSMS.sender !== 'Unknown' &&
    parsedSMS.receiver !== 'Unknown' &&
    parsedSMS.port !== 'Unknown'
  );
}

/**
 * Get SMS statistics
 */
export function getSMSStats(results: ForwardingResult[]): {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
} {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  return {
    total,
    successful,
    failed,
    successRate: Math.round(successRate * 100) / 100
  };
}