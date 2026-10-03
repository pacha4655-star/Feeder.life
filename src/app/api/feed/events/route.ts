import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { UserProfileService } from '@/lib/recommendation/user-profile';
import { ContentAnalyzer } from '@/lib/recommendation/content-analyzer';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user ? user.id : 'guest';

    if (userId !== 'guest') {
      const rateLimit = checkRateLimit('feed_events', userId, { limit: 120, windowMs: 60 * 1000 });
      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit);
      }
    }

    const body = await request.json().catch(() => ({}));
    const { eventType, postId, authorId, durationMs, completionRatio, topics: rawTopics } = body;

    if (!eventType || !postId) {
      return NextResponse.json({ error: 'eventType and postId are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Resolve topics if not provided
    let topics = Array.isArray(rawTopics) ? rawTopics : [];
    if (topics.length === 0) {
      const { data: postRow } = await supabase
        .from('social_posts')
        .select('content, hashtags, data')
        .eq('id', postId)
        .maybeSingle();

      if (postRow) {
        topics = ContentAnalyzer.extractTopics({
          content: postRow.content,
          hashtags: postRow.hashtags,
          title: postRow.data?.title,
          contentType: postRow.data?.content_type,
          animalType: postRow.data?.animal_type,
        });
      }
    }

    // 2. Record interaction in recommendation user profile
    if (userId !== 'guest') {
      await UserProfileService.recordInteraction({
        userId,
        eventType,
        topics,
        authorId,
        postId,
        durationMs,
        completionRatio,
      });
    }

    // 3. Persist telemetry event record in platform_data for real-world metrics audit
    try {
      await supabase.from('platform_data').insert({
        data_type: 'audit',
        user_id: userId !== 'guest' ? userId : null,
        target_id: postId,
        data: {
          subtype: 'recommendation_telemetry',
          event_type: eventType,
          author_id: authorId || null,
          duration_ms: durationMs || null,
          completion_ratio: completionRatio || null,
          topics,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('[FeedEvents] Non-fatal audit log write error:', auditErr);
    }

    // 4. Increment post stats (views, video watch) if relevant
    if (eventType === 'view' || eventType === 'video_complete') {
      try {
        const { data: postData } = await supabase
          .from('social_posts')
          .select('stats')
          .eq('id', postId)
          .maybeSingle();

        if (postData) {
          const stats = postData.stats || {};
          const updatedViews = (stats.views_count || 0) + 1;
          await supabase
            .from('social_posts')
            .update({
              stats: {
                ...stats,
                views_count: updatedViews,
                ...(eventType === 'video_complete' ? { video_completes_count: (stats.video_completes_count || 0) + 1 } : {}),
              },
            })
            .eq('id', postId);
        }
      } catch (statsErr) {
        console.warn('[FeedEvents] Non-fatal error updating post views:', statsErr);
      }
    }

    return NextResponse.json({ success: true, eventType, recorded: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process event' }, { status: 500 });
  }
}
