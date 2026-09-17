import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { AiChatService } from '@/lib/services/ai-chat';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication Server-side
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to chat with Feeder AI.' },
        { status: 401 }
      );
    }

    // 2. Server-side Rate Limiting based on verified user identity
    const rateCheck = checkRateLimit('ai_chat', user.id, RATE_LIMIT_CONFIG.ai);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You're sending messages too quickly. Please try again in a moment.",
          retryAfter: rateCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfterSeconds.toString(),
            'X-RateLimit-Limit': rateCheck.limit.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 3. Input Parsing & Validation
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const rawMessage = body.message ?? body.query;
    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty.' },
        { status: 400 }
      );
    }

    const cleanMessage = rawMessage.trim();
    if (cleanMessage.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'Message exceeds maximum length of 4000 characters.' },
        { status: 400 }
      );
    }

    let conversationId: string | null = null;
    if (body.conversationId) {
      const rawConvId = String(body.conversationId).trim();
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(rawConvId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid conversation identifier format.' },
          { status: 400 }
        );
      }
      conversationId = rawConvId;
    }

    // 4. Execute AI pipeline with Google Gemini & conversation memory
    const response = await AiChatService.sendMessage({
      userId: user.id,
      conversationId,
      messageText: cleanMessage,
    });

    return NextResponse.json({
      success: true,
      conversationId: response.conversationId,
      messageId: response.messageId,
      content: response.content,
      role: response.role,
      createdAt: response.createdAt,
    });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You do not have permission to access this conversation.' },
        { status: 403 }
      );
    }
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Conversation not found.' },
        { status: 404 }
      );
    }
    if (error.message === 'RATE_LIMITED' || error.message?.includes('429')) {
      return NextResponse.json(
        { success: false, error: "You're sending messages too quickly. Please try again in a moment." },
        { status: 429 }
      );
    }

    console.error('[POST /api/ai/chat] Gemini API error:', error);
    return NextResponse.json(
      { success: false, error: "Sorry, I couldn't process that right now. Please try again." },
      { status: 500 }
    );
  }
}
