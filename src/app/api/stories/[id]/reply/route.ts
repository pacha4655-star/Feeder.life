import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { MessagingService } from '@/lib/services/messaging';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit('story_reply', user.id, { limit: 30, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const { id: storyId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Reply text cannot be empty' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: story, error: storyErr } = await supabase
      .from('social_posts')
      .select('id, user_id, media')
      .eq('id', storyId)
      .eq('record_type', 'story')
      .maybeSingle();

    if (storyErr || !story) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
    }

    if (story.user_id === user.id) {
      return NextResponse.json({ success: false, error: 'Cannot reply to your own story' }, { status: 400 });
    }

    // Get or create direct conversation with story author
    const convId = await MessagingService.getOrCreateDirectConversation(user.id, story.user_id);

    // Send the message with context
    const replyBody = `[Replied to Story]: ${text.trim()}`;
    const mediaUrl = Array.isArray(story.media) && story.media.length > 0 ? (typeof story.media[0] === 'string' ? story.media[0] : story.media[0].url) : undefined;
    const message = await MessagingService.sendMessage(convId, user.id, replyBody, mediaUrl);

    return NextResponse.json({ success: true, conversationId: convId, message });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
