import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Message } from '@/models';
import { forwardSms } from '@/services/smsForwardingService';
import { getSocketIO } from '@/lib/socket';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    let raw = await req.text(); // Instead of 'on data', use await req.text()

    await connectDB();

    console.log('\n📦 Raw incoming body:\n' + raw + '\n');

    const sender = raw.match(/Sender:\s*(.*)/)?.[1]?.trim() || 'Unknown';
    const receiverLine = raw.match(/Receiver:\s*(.*)/)?.[1]?.trim() || '';
    const port = receiverLine.match(/"([^"]+)"/)?.[1] || 'Unknown';
    let receiver = receiverLine.replace(/"[^"]+"\s*/, '') || 'Unknown';

    // Normalize receiver number - remove '91' prefix if it's a 12-digit number (91 + 10 digit number)
    // Important: Don't modify 10-digit numbers that happen to start with 91 (like 9156789012)
    const receiverStr = receiver.toString();
    const originalReceiver = receiver;
    if (receiverStr.length === 12 && receiverStr.startsWith('91')) {
      receiver = receiverStr.substring(2);
      console.log(`📞 Normalized receiver: ${originalReceiver} -> ${receiver} (removed 91 prefix from 12-digit number)`);
    } else {
      console.log(`📞 Receiver unchanged: ${receiver} (length: ${receiverStr.length})`);
    }

    const scts = raw.match(/SCTS:\s*(\d+)/)?.[1] || '';
    const time = scts
      ? new Date(
          `20${scts.slice(0, 2)}-${scts.slice(2, 4)}-${scts.slice(4, 6)}T${scts.slice(6, 8)}:${scts.slice(8, 10)}:${scts.slice(10, 12)}`
        )
      : new Date();

    const message2 = raw
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("Sender:") && !l.startsWith("Receiver:") && !l.startsWith("SCTS:") && !l.startsWith("SMSC:") && !l.startsWith("Slot:"))
      .join(" ");

    // Step 2: Clean extra spaces
    const message = message2.replace(/\s+/g, " ").trim();

    // Create message in database
    const smsMessage = await Message.create({
      sender,
      receiver,
      port,
      time,
      message,
    });

    console.log('----------------------------------');
    console.log(`🟢 Port    : ${port}`);
    console.log(`📨 Sender  : ${sender}`);
    console.log(`📥 Receiver: ${receiver}`);
    console.log(`🕰️  Time    : ${time.toISOString()}`);
    console.log(`💬 Message : ${message}`);
    console.log('----------------------------------');

    // Forward SMS to configured URLs
    try {
      const smsData = {
        _id: smsMessage._id,
        id: smsMessage._id,
        deviceId: port, // Using port as deviceId for compatibility
        sender: sender,
        recipient: receiver,
        message: message,
        timestamp: time.toISOString(),
        receivedAt: new Date().toISOString(),
        slotIndex: 0, // Default slot since not available in this format
        carrierName: `Port ${port}`,
        slotInfo: {
          slotIndex: 0,
          carrierName: `Port ${port}`,
          phoneNumber: receiver
        }
      };

      // Forward to configured URLs asynchronously (don't block SMS processing)
      forwardSms(smsData, { deviceId: port }).catch(error => {
        console.error('SMS forwarding error:', error);
      });

      console.log('📤 SMS forwarding initiated');
    } catch (forwardingError) {
      console.error('Error preparing SMS forwarding:', forwardingError);
      // Don't fail the SMS processing if forwarding fails
    }

    // Emit real-time SMS notification via Socket.IO
    try {
      const io = getSocketIO();
      if (io) {
        const smsData = {
          id: smsMessage._id,
          deviceId: port,
          deviceIdStr: port,
          sender: sender,
          recipient: receiver,
          message: message,
          timestamp: time.toISOString(),
          receivedAt: new Date().toISOString(),
          slotIndex: 0,
          carrierName: `Port ${port}`,
          slotInfo: {
            slotIndex: 0,
            carrierName: `Port ${port}`,
            phoneNumber: receiver
          }
        };

        // Emit to device-specific room
        io.to(`device-${port}`).emit('sms-received', smsData);

        // Emit to dashboard for global SMS updates
        io.to('dashboard').emit('sms-received', smsData);

        // Update and broadcast SMS stats
        const totalSms = await Message.countDocuments();
        const receivedSms = await Message.countDocuments({ sender: { $ne: null } });

        io.to('dashboard').emit('stats-update', {
          totalSms,
          receivedSms,
          type: 'sms',
          deviceId: port,
          timestamp: new Date()
        });

        console.log('📡 Socket.IO notifications sent');
      }

    } catch (socketError) {
      console.error('Error emitting SMS socket events:', socketError);
      // Don't fail the SMS processing if socket emission fails
    }

    return NextResponse.json({
      status: 'ok',
      messageId: smsMessage._id,
      forwarded: true
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ Failed to parse SMS:', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Parse error' }, {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}