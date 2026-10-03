import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: rawTarget } = await context.params;
    if (!rawTarget) {
      return NextResponse.json({ error: 'Target user required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const cleanTarget = decodeURIComponent(rawTarget).replace(/^@/, '').trim();

    // Check if target is UUID or username
    let targetId = cleanTarget;
    const { data: targetRows } = await supabase
      .from('users')
      .select('id, display_name, username')
      .or(`id.eq.${cleanTarget},username.ilike.${cleanTarget}`)
      .limit(1);

    const targetUser = targetRows && targetRows[0];
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    targetId = targetUser.id;

    if (targetId === user.id) {
      return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
    }

    const rateLimit = checkRateLimit('user_follow', user.id, { limit: 60, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
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

      // Create notification
      await supabase.from('platform_data').insert({
        data_type: 'notification',
        user_id: targetId,
        target_id: user.id,
        status: 'unread',
        data: {
          type: 'FOLLOW',
          title: 'New Guardian Follower',
          body: `${user.fullName} started following your animal welfare activity.`,
          target_url: `/profile/${encodeURIComponent(user.username || user.id)}`,
          sender_name: user.fullName,
          sender_avatar: user.avatarUrl,
        },
      });
    }

    // Compute updated counts
    const [
      { count: targetFollowerCount },
      { count: targetFollowingCount },
      { count: viewerFollowingCount }
    ] = await Promise.all([
      supabase.from('platform_data').select('*', { count: 'exact', head: true }).eq('data_type', 'follow').eq('target_id', targetId),
      supabase.from('platform_data').select('*', { count: 'exact', head: true }).eq('data_type', 'follow').eq('user_id', targetId),
      supabase.from('platform_data').select('*', { count: 'exact', head: true }).eq('data_type', 'follow').eq('user_id', user.id),
    ]);

    return NextResponse.json({
      success: true,
      following: isFollowing,
      targetUserId: targetId,
      followerCount: targetFollowerCount || 0,
      followingCount: targetFollowingCount || 0,
      viewerFollowingCount: viewerFollowingCount || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update follow relationship' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    const { id: rawTarget } = await context.params;
    const cleanTarget = decodeURIComponent(rawTarget).replace(/^@/, '').trim();
    const supabase = getSupabaseServerClient();

    let targetId = cleanTarget;
    const { data: targetRows } = await supabase
      .from('users')
      .select('id')
      .or(`id.eq.${cleanTarget},username.ilike.${cleanTarget}`)
      .limit(1);

    if (targetRows && targetRows.length > 0) {
      targetId = targetRows[0].id;
    }

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

    const [
      { count: followerCount },
      { count: followingCount }
    ] = await Promise.all([
      supabase.from('platform_data').select('*', { count: 'exact', head: true }).eq('data_type', 'follow').eq('target_id', targetId),
      supabase.from('platform_data').select('*', { count: 'exact', head: true }).eq('data_type', 'follow').eq('user_id', targetId),
    ]);

    return NextResponse.json({
      success: true,
      following: isFollowing,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch follow status' }, { status: 500 });
  }
}
