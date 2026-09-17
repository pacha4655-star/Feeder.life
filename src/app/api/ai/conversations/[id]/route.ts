import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { AiChatService } from '@/lib/services/ai-chat';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { id: conversationId } = await context.params;
    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Missing conversation identifier.' },
        { status: 400 }
      );
    }

    const messages = await AiChatService.getConversationMessages(user.id, conversationId);
    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You do not have access to this conversation.' },
        { status: 403 }
      );
    }
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Conversation not found.' },
        { status: 404 }
      );
    }

    console.error('[GET /api/ai/conversations/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to retrieve conversation messages.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { id: conversationId } = await context.params;
    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Missing conversation identifier.' },
        { status: 400 }
      );
    }

    await AiChatService.deleteConversation(user.id, conversationId);
    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You do not have access to this conversation.' },
        { status: 403 }
      );
    }
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Conversation not found.' },
        { status: 404 }
      );
    }

    console.error('[DELETE /api/ai/conversations/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to delete conversation.' },
      { status: 500 }
    );
  }
}
