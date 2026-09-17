import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { MessagingService } from '@/lib/services/messaging';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await context.params;
    const messages = await MessagingService.getMessages(conversationId, user.id);

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    if (error.message?.includes('Not authorized')) {
      return NextResponse.json({ error: 'You are not a participant in this conversation.' }, { status: 403 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await context.params;
    const body = await request.json();
    const { text, mediaUrl } = body;

    if (!text && !mediaUrl) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const message = await MessagingService.sendMessage(
      conversationId,
      user.id,
      text || '',
      mediaUrl
    );

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    if (error.message?.includes('Not authorized')) {
      return NextResponse.json({ error: 'You are not a participant in this conversation.' }, { status: 403 });
    }
    if (error.message?.includes('blocked')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes('not available') || error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await context.params;
    await MessagingService.markConversationAsRead(conversationId, user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
