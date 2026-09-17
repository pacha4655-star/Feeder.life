import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { StoryService } from '@/lib/services/story';
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

    const rateLimit = checkRateLimit('story_react', user.id, { limit: 60, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const { id: storyId } = await context.params;
    const body = await request.json();
    const { reaction } = body;

    const allowedReactions = ['HEART', 'PAW', 'CARE', 'APPLAUSE'];
    const reactionType = (reaction || 'HEART').toUpperCase();

    if (!allowedReactions.includes(reactionType)) {
      return NextResponse.json({ success: false, error: 'Invalid reaction type' }, { status: 400 });
    }

    const result = await StoryService.reactToStory({
      storyId,
      userId: user.id,
      reactionType,
    });

    return NextResponse.json({
      success: true,
      reaction: result.reaction,
      count: result.count,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
