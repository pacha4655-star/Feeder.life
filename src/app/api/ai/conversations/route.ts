import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/lib/auth/unified-auth';
import { AiChatService } from '@/lib/services/ai-chat';

export async function GET(request: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const conversations = await AiChatService.getConversations(user.id);
    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error('[GET /api/ai/conversations] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load conversations.' },
      { status: 500 }
    );
  }
}
