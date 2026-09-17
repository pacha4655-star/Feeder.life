import { NextRequest, NextResponse } from 'next/server';
import { StoryService } from '@/lib/services/story';
import { getCurrentUser } from '@/lib/auth/session';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const stories = await StoryService.getActiveStories(user ? user.id : undefined);
    return NextResponse.json({ success: true, stories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const rateLimit = checkRateLimit('story_create', user.id, { limit: 30, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json();
    const { mediaUrl, mediaType = 'IMAGE', caption } = body;

    if (!mediaUrl || !mediaUrl.trim()) {
      return NextResponse.json({ success: false, error: 'Story image or video URL is required' }, { status: 400 });
    }

    const storyId = await StoryService.createStory({
      authorId: user.id,
      mediaUrl: mediaUrl.trim(),
      mediaType,
      caption: caption ? caption.trim() : undefined,
    });

    return NextResponse.json({ success: true, storyId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
