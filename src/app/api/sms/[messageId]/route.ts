import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SmsMessage } from '@/models';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;

    // Ensure database connection
    await connectDB();

    // Delete SMS message from database
    await SmsMessage.findByIdAndDelete(messageId);

    console.log(`SMS message deleted: ${messageId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting SMS message:', error);
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
