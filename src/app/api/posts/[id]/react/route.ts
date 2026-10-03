import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const user = await getCurrentUser(request);
    const supabase = getSupabaseServerClient();

    const { data: post, error } = await supabase
      .from('social_posts')
      .select('id, reactions, stats')
      .eq('id', postId)
      .maybeSingle();

    if (error || !post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const reactionsObj = (post.reactions && typeof post.reactions === 'object' ? post.reactions : {}) as Record<string, any>;
    const count = typeof post.stats?.likes_count === 'number'
      ? post.stats.likes_count
      : Object.keys(reactionsObj).length;

    let userReaction: string | null = null;
    if (user && reactionsObj[user.id]) {
      userReaction = typeof reactionsObj[user.id] === 'string'
        ? reactionsObj[user.id]
        : (reactionsObj[user.id].type || 'CARE');
    }

    return NextResponse.json({
      success: true,
      reactionCount: count,
      userReaction,
      likedByCurrentUser: !!userReaction,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch reaction state' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { reactionType = 'CARE', action } = body;

    const supabase = getSupabaseServerClient();

    // Fetch post to get author, reactions, and current count
    const { data: post, error: postErr } = await supabase
      .from('social_posts')
      .select('id, user_id, reactions, stats')
      .eq('id', postId)
      .maybeSingle();

    if (postErr || !post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const reactionsObj = (post.reactions && typeof post.reactions === 'object' ? { ...post.reactions } : {}) as Record<string, any>;
    const existingReaction = reactionsObj[user.id] ? (typeof reactionsObj[user.id] === 'string' ? reactionsObj[user.id] : reactionsObj[user.id].type) : null;

    // Check existing reaction in platform_data for audit/cross-consistency
    const { data: existingRows } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'post_reaction')
      .eq('user_id', user.id)
      .eq('target_id', postId);

    const existingPlatformRow = existingRows && existingRows[0];
    let userReaction: string | null = reactionType;
    let isUnlike = false;

    if (action === 'unlike' || (action !== 'like' && (existingReaction === reactionType || (!existingReaction && existingPlatformRow)))) {
      // Toggle off / Unlike
      isUnlike = true;
      delete reactionsObj[user.id];
      userReaction = null;

      if (existingPlatformRow) {
        await supabase.from('platform_data').delete().eq('id', existingPlatformRow.id);
      }
    } else {
      // Like / React
      reactionsObj[user.id] = { type: reactionType, created_at: new Date().toISOString() };
      userReaction = reactionType;

      if (existingPlatformRow) {
        await supabase
          .from('platform_data')
          .update({
            data: { reaction_type: reactionType, updated_at: new Date().toISOString() },
          })
          .eq('id', existingPlatformRow.id);
      } else {
        await supabase.from('platform_data').insert({
          data_type: 'post_reaction',
          user_id: user.id,
          target_id: postId,
          status: 'active',
          data: { reaction_type: reactionType, created_at: new Date().toISOString() },
        });

        // Notify post author if not self
        if (post.user_id && post.user_id !== user.id) {
          await supabase.from('platform_data').insert({
            data_type: 'notification',
            user_id: post.user_id,
            target_id: user.id,
            target_user_id: user.id,
            status: 'unread',
            data: {
              type: 'REACTION',
              title: 'New reaction on your post',
              body: `${user.fullName} reacted with care to your post.`,
              target_url: `/#${postId}`,
              sender_name: user.fullName,
              sender_avatar: user.avatarUrl,
              post_id: postId,
            },
          });
        }
      }
    }

    const newCount = Math.max(0, Object.keys(reactionsObj).length);
    const updatedStats = {
      ...(post.stats && typeof post.stats === 'object' ? post.stats : {}),
      likes_count: newCount,
    };

    await supabase
      .from('social_posts')
      .update({
        reactions: reactionsObj,
        stats: updatedStats,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    return NextResponse.json({
      success: true,
      reactionCount: newCount,
      userReaction,
      likedByCurrentUser: !isUnlike,
    });
  } catch (error: any) {
    console.error('Reaction POST error:', error);
    return NextResponse.json({ success: false, error: 'Couldn\'t update your like. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    const { data: post, error: postErr } = await supabase
      .from('social_posts')
      .select('id, user_id, reactions, stats')
      .eq('id', postId)
      .maybeSingle();

    if (postErr || !post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const reactionsObj = (post.reactions && typeof post.reactions === 'object' ? { ...post.reactions } : {}) as Record<string, any>;
    delete reactionsObj[user.id];

    // Remove from platform_data
    await supabase
      .from('platform_data')
      .delete()
      .eq('data_type', 'post_reaction')
      .eq('user_id', user.id)
      .eq('target_id', postId);

    const newCount = Math.max(0, Object.keys(reactionsObj).length);
    const updatedStats = {
      ...(post.stats && typeof post.stats === 'object' ? post.stats : {}),
      likes_count: newCount,
    };

    await supabase
      .from('social_posts')
      .update({
        reactions: reactionsObj,
        stats: updatedStats,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    return NextResponse.json({
      success: true,
      reactionCount: newCount,
      userReaction: null,
      likedByCurrentUser: false,
    });
  } catch (error: any) {
    console.error('Reaction DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Couldn\'t update your like. Please try again.' }, { status: 500 });
  }
}
