import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { reactionType = 'SUPPORT' } = body;

    const supabase = getSupabaseServerClient();

    // Check existing reaction in platform_data
    const { data: existingRows } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'post_reaction')
      .eq('user_id', user.id)
      .eq('target_id', postId);

    const existing = existingRows && existingRows[0];
    let userReaction: string | null = reactionType;

    // Fetch post to get author and current count
    const { data: post } = await supabase
      .from('social_posts')
      .select('id, user_id, likes_count')
      .eq('id', postId)
      .maybeSingle();

    let newCount = post?.likes_count || 0;

    if (existing) {
      if (existing.data?.reaction_type === reactionType) {
        // Toggle off
        await supabase.from('platform_data').delete().eq('id', existing.id);
        newCount = Math.max(0, newCount - 1);
        userReaction = null;
      } else {
        // Update reaction
        await supabase
          .from('platform_data')
          .update({
            data: { reaction_type: reactionType, updated_at: new Date().toISOString() },
          })
          .eq('id', existing.id);
        userReaction = reactionType;
      }
    } else {
      // Insert new reaction
      await supabase.from('platform_data').insert({
        data_type: 'post_reaction',
        user_id: user.id,
        target_id: postId,
        status: 'active',
        data: { reaction_type: reactionType, created_at: new Date().toISOString() },
      });
      newCount += 1;

      // Notify post author if not self
      if (post && post.user_id !== user.id) {
        await supabase.from('platform_data').insert({
          data_type: 'notification',
          user_id: post.user_id,
          target_id: user.id,
          status: 'unread',
          data: {
            type: 'REACTION',
            title: 'New reaction on your post',
            body: `${user.fullName} reacted with ${reactionType} to your post.`,
            target_url: `/#${postId}`,
            sender_name: user.fullName,
            sender_avatar: user.avatarUrl,
          },
        });
      }
    }

    await supabase
      .from('social_posts')
      .update({ likes_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', postId);

    return NextResponse.json({
      success: true,
      reactionCount: newCount,
      userReaction,
    });
  } catch (error: any) {
    console.error('Reaction error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
