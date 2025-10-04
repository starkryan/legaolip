import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    
    // Delete SMS message from database
    await prisma.smsMessage.delete({
      where: { id: messageId }
    });
    
    console.log(`SMS message deleted: ${messageId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting SMS message:', error);
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
