import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { AiChatService } from '@/lib/services/ai-chat';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  const tStart = Date.now();
  try {
    // 1. Verify Authentication Server-side
    const user = await resolveAuthenticatedUser(request);
    const authDurationMs = Date.now() - tStart;

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

    const wantsStream = body.stream === true || request.headers.get('accept')?.includes('text/event-stream');

    // 4. Stream Response (Ultra-Low TTFT)
    if (wantsStream) {
      const { stream, conversationId: activeConvId } = await AiChatService.streamMessage({
        userId: user.id,
        conversationId,
        messageText: cleanMessage,
        authDurationMs,
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Conversation-Id': activeConvId,
          'Cache-Control': 'no-cache, no-transform',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // 5. Standard Non-Streaming JSON Response (Optimized parallel persistence)
    const response = await AiChatService.sendMessage({
      userId: user.id,
      conversationId,
      messageText: cleanMessage,
      authDurationMs,
    });

    return NextResponse.json({
      success: true,
      conversationId: response.conversationId,
      messageId: response.messageId,
      content: response.content,
      role: response.role,
      createdAt: response.createdAt,
      metrics: response.metrics,
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
    if (error.message === 'GEMINI_API_NOT_ENABLED') {
      return NextResponse.json(
        {
          success: false,
          error: "Google Gemini API is not enabled for the configured Google Cloud project or GEMINI_API_KEY is not set. Please set GEMINI_API_KEY in Vercel environment variables or enable Generative Language API in Google Cloud Console.",
        },
        { status: 503 }
      );
    }
    if (error.message === 'GEMINI_API_KEY_MISSING') {
      return NextResponse.json(
        {
          success: false,
          error: "Gemini API key is not configured. Please set GEMINI_API_KEY in Vercel environment variables.",
        },
        { status: 503 }
      );
    }
    if (error.message === 'GEMINI_INVALID_API_KEY') {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Google Gemini API key. Please check your GEMINI_API_KEY in Vercel environment variables.",
        },
        { status: 503 }
      );
    }
    if (error.message === 'GEMINI_MODEL_NOT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          error: "Configured Gemini model is not available. Please verify GEMINI_MODEL.",
        },
        { status: 503 }
      );
    }

    console.error('[POST /api/ai/chat] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: "Sorry, I couldn't process that right now. Please try again." },
      { status: 500 }
    );
  }
}
