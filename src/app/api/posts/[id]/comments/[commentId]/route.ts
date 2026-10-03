import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { canDeleteResource } from '@/lib/security/rbac';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: postId, commentId } = await context.params;
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'Missing commentId' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Fetch the comment to verify ownership
    const { data: comment, error: commentErr } = await supabase
      .from('social_posts')
      .select('id, user_id, parent_id, record_type')
      .eq('id', commentId)
      .eq('parent_id', postId)
      .eq('record_type', 'comment')
      .maybeSingle();

    if (commentErr || !comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    // Strict authorization: Only author or admin/moderator can delete
    if (!canDeleteResource(user.id, user.role, comment.user_id)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You can only delete your own comments.' },
        { status: 403 }
      );
    }

    // Mark as deleted
    await supabase
      .from('social_posts')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    // Fetch parent post to update comment count
    const { data: post } = await supabase
      .from('social_posts')
      .select('id, comments, stats')
      .eq('id', postId)
      .maybeSingle();

    let newCommentCount = 0;
    if (post) {
      const currentCount = typeof post.comments?.count === 'number'
        ? post.comments.count
        : (typeof post.stats?.comments_count === 'number' ? post.stats.comments_count : 1);

      newCommentCount = Math.max(0, currentCount - 1);

      await supabase
        .from('social_posts')
        .update({
          comments: { count: newCommentCount },
          stats: {
            ...(post.stats && typeof post.stats === 'object' ? post.stats : {}),
            comments_count: newCommentCount,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);
    }

    return NextResponse.json({
      success: true,
      commentId,
      commentCount: newCommentCount,
      message: 'Comment deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete comment by id error:', error);
    return NextResponse.json({ success: false, error: 'Couldn\'t delete the comment. Please try again.' }, { status: 500 });
  }
}
