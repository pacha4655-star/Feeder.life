import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { AiChatService } from '@/lib/services/ai-chat';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const rateCheck = checkRateLimit('ai_chat', user.id, RATE_LIMIT_CONFIG.ai);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You're sending messages too quickly. Please try again in a moment.",
          retryAfter: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request payload.' }, { status: 400 });
    }

    const query = body.query || body.message;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ success: false, error: 'Query cannot be empty.' }, { status: 400 });
    }

    const conversationId = body.conversationId ? String(body.conversationId).trim() : null;
    const response = await AiChatService.sendMessage({
      userId: user.id,
      conversationId,
      messageText: query.trim(),
    });

    return NextResponse.json({
      success: true,
      messageId: response.messageId,
      conversationId: response.conversationId,
      content: response.content,
      role: response.role,
      createdAt: response.createdAt,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }
    if (error.message === 'RATE_LIMITED' || error.message?.includes('429')) {
      return NextResponse.json(
        { success: false, error: "You're sending messages too quickly. Please try again in a moment." },
        { status: 429 }
      );
    }
    console.error('Ask Feeder error:', error);
    return NextResponse.json(
      { success: false, error: "Sorry, I couldn't process that right now. Please try again." },
      { status: 500 }
    );
  }
}
