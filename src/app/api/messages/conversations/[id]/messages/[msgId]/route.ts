import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { MessagingService } from '@/lib/services/messaging';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; msgId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId, msgId } = await context.params;

    try {
      await MessagingService.deleteMessage(conversationId, msgId, user.id, user.role);
      return NextResponse.json({ success: true, deletedMessageId: msgId });
    } catch (err: any) {
      if (err.message?.includes('Not authorized')) {
        return NextResponse.json({ error: 'You are not authorized to delete this message.' }, { status: 403 });
      }
      if (err.message?.includes('not found')) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
