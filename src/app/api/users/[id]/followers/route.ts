import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetIdentifier } = await context.params;
    if (!targetIdentifier) {
      return NextResponse.json({ error: 'Target user ID or username required' }, { status: 400 });
    }

    const currentUser = await getCurrentUser(request);
    const supabase = getSupabaseServerClient();
    const cleanTarget = decodeURIComponent(targetIdentifier).replace(/^@/, '').trim();

    // 1. Resolve target user ID if a username or UUID was passed
    let targetUserId = cleanTarget;
    const { data: userRows } = await supabase
      .from('users')
      .select('id, username')
      .or(`id.eq.${cleanTarget},username.ilike.${cleanTarget}`)
      .limit(1);

    if (userRows && userRows.length > 0) {
      targetUserId = userRows[0].id;
    }

    // Pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // 2. Query total count and follower rows from platform_data
    const { count: totalCount, error: countErr } = await supabase
      .from('platform_data')
      .select('*', { count: 'exact', head: true })
      .eq('data_type', 'follow')
      .eq('target_id', targetUserId);

    if (countErr) {
      return NextResponse.json({ error: 'Failed to fetch followers' }, { status: 500 });
    }

    const { data: followRows, error: followErr } = await supabase
      .from('platform_data')
      .select('id, user_id, created_at')
      .eq('data_type', 'follow')
      .eq('target_id', targetUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (followErr) {
      return NextResponse.json({ error: 'Failed to fetch followers list' }, { status: 500 });
    }

    const followerIds = (followRows || []).map((r: any) => r.user_id).filter(Boolean);

    if (followerIds.length === 0) {
      return NextResponse.json({
        success: true,
        followers: [],
        totalCount: totalCount || 0,
        page,
        limit,
        hasMore: false,
      });
    }

    // 3. Batch fetch user profiles for these follower IDs
    const { data: userList } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, city, profile_data, is_verified')
      .in('id', followerIds);

    const userMap = new Map((userList || []).map((u: any) => [u.id, u]));

    // 4. Check if current logged-in user is following any of these followers
    let followedByCurrentSet = new Set<string>();
    if (currentUser) {
      const { data: currentFollows } = await supabase
        .from('platform_data')
        .select('target_id')
        .eq('data_type', 'follow')
        .eq('user_id', currentUser.id)
        .in('target_id', followerIds);

      followedByCurrentSet = new Set((currentFollows || []).map((r: any) => r.target_id));
    }

    // 5. Construct ordered follower items matching the original query order
    const followers = followerIds
      .map((userId) => {
        const u = userMap.get(userId);
        if (!u) return null;
        return {
          id: u.id,
          username: u.username || u.id,
          fullName: u.display_name || u.username || 'Animal Guardian',
          avatarUrl: u.avatar_url || null,
          role: u.profile_data?.role || u.role || 'USER',
          feederLevel: u.profile_data?.feeder_level || 'Grassroots Feeder',
          areaName: u.profile_data?.area_name || '',
          city: u.city || '',
          bio: u.bio || '',
          isVerified: u.is_verified === 1 || u.is_verified === true,
          isFollowing: followedByCurrentSet.has(u.id),
          isSelf: currentUser ? currentUser.id === u.id : false,
        };
      })
      .filter(Boolean);

    const hasMore = offset + limit < (totalCount || 0);

    return NextResponse.json({
      success: true,
      followers,
      totalCount: totalCount || 0,
      page,
      limit,
      hasMore,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
