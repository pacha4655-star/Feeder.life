import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: targetId } = await context.params;
    if (!targetId || targetId === user.id) {
      return NextResponse.json({ error: 'Invalid user target' }, { status: 400 });
    }

    const rateLimit = checkRateLimit('user_follow', user.id, { limit: 40, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const supabase = getSupabaseServerClient();

    // Check if target user exists
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, display_name, username')
      .eq('id', targetId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check existing follow in platform_data
    const { data: existingRows } = await supabase
      .from('platform_data')
      .select('id')
      .eq('data_type', 'follow')
      .eq('user_id', user.id)
      .eq('target_id', targetId);

    const existing = existingRows && existingRows[0];
    let isFollowing = false;

    if (existing) {
      // Unfollow
      await supabase.from('platform_data').delete().eq('id', existing.id);
      isFollowing = false;
    } else {
      // Follow
      await supabase.from('platform_data').insert({
        data_type: 'follow',
        user_id: user.id,
        target_id: targetId,
        status: 'active',
        data: {
          followed_at: new Date().toISOString(),
        },
      });
      isFollowing = true;

      // Notification
      await supabase.from('platform_data').insert({
        data_type: 'notification',
        user_id: targetId,
        target_id: user.id,
        status: 'unread',
        data: {
          type: 'SYSTEM',
          title: 'New Guardian Follower',
          body: `${user.fullName} started following your animal welfare activity.`,
          target_url: `/profile/${user.username}`,
          sender_name: user.fullName,
          sender_avatar: user.avatarUrl,
        },
      });
    }

    // Follower count for target
    const { count: followerCount } = await supabase
      .from('platform_data')
      .select('*', { count: 'exact', head: true })
      .eq('data_type', 'follow')
      .eq('target_id', targetId);

    return NextResponse.json({
      success: true,
      following: isFollowing,
      followerCount: followerCount || 0,
      followingCount: 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id: targetId } = await context.params;
    const supabase = getSupabaseServerClient();

    let isFollowing = false;
    if (user) {
      const { data: rel } = await supabase
        .from('platform_data')
        .select('id')
        .eq('data_type', 'follow')
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .maybeSingle();
      isFollowing = !!rel;
    }

    const { count: followerCount } = await supabase
      .from('platform_data')
      .select('*', { count: 'exact', head: true })
      .eq('data_type', 'follow')
      .eq('target_id', targetId);

    const { count: followingCount } = await supabase
      .from('platform_data')
      .select('*', { count: 'exact', head: true })
      .eq('data_type', 'follow')
      .eq('user_id', targetId);

    return NextResponse.json({
      following: isFollowing,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
