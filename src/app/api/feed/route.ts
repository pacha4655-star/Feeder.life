import { NextRequest, NextResponse } from 'next/server';
import { FeedRankingService } from '@/lib/services/feed-ranking';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { validatePostPayload } from '@/lib/validation/schemas';
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIG } from '@/lib/security/rate-limit';
import logger from '@/lib/monitoring/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const tab = (searchParams.get('tab') as any) || 'FOR_YOU';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor');
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const userLat = latParam ? parseFloat(latParam) : undefined;
    const userLon = lonParam ? parseFloat(lonParam) : undefined;

    const result = await FeedRankingService.getRankedFeedPaginated({
      userId: user ? user.id : 'guest',
      tab,
      limit,
      cursor,
      userLat,
      userLon,
    });

    return NextResponse.json({
      success: true,
      posts: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    logger.error('Feed API error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Rate limiting: Post creation
    const rateLimit = checkRateLimit('post_create', user.id, RATE_LIMIT_CONFIG.postCreation);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const rawBody = await request.json().catch(() => ({}));
    const validation = validatePostPayload(rawBody);
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error || 'Invalid post payload' }, { status: 400 });
    }

    const {
      title,
      body: content,
      contentType,
      communityId,
      mediaUrls,
      tags,
      locationName,
      approxLat,
      approxLon,
      visibility,
    } = validation.data;

    // Strict server-side verification: Real animal welfare media only for attached images
    if (mediaUrls && mediaUrls.length > 0) {
      const { MediaValidatorService } = await import('@/lib/services/media-validator');
      for (const url of mediaUrls) {
        const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
        if (!isVideo) {
          const mediaCheck = await MediaValidatorService.validateMedia({
            mediaUrl: url,
            mimeType: 'image/jpeg',
          });
          if (!mediaCheck.isValid) {
            return NextResponse.json(
              {
                success: false,
                error: mediaCheck.reason || 'This upload can\'t be used for an animal welfare Post. Please upload a real photo or video of an animal.',
                validation: mediaCheck,
              },
              { status: 422 }
            );
          }
        }
      }
    }

    const supabase = getSupabaseServerClient();
    const { data: newPost, error: insertError } = await supabase
      .from('social_posts')
      .insert({
        record_type: 'post',
        user_id: user.id,
        community_id: communityId || null,
        content,
        data: {
          title: title || null,
          content_type: contentType,
          location_name: locationName || null,
          approx_lat: approxLat || null,
          approx_lon: approxLon || null,
        },
        media: mediaUrls.map((url) => ({
          url,
          type: /\.(mp4|webm|mov)(\?.*)?$/i.test(url) ? 'video' : 'image',
        })),
        reactions: {},
        comments: { count: 0 },
        hashtags: tags,
        mentions: [],
        visibility: (visibility || 'public').toLowerCase(),
        is_active: true,
        is_deleted: false,
        stats: { views_count: 0, likes_count: 0 },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Feed POST] Supabase insert error:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    logger.info('Post created', { userId: user.id, postId: newPost.id });

    return NextResponse.json({ success: true, postId: newPost.id });
  } catch (error: any) {
    logger.error('Create Post error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
