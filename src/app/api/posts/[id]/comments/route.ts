import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { canDeleteResource } from '@/lib/security/rbac';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data: rows, error } = await supabase
      .from('social_posts')
      .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url, profile_data)')
      .eq('record_type', 'comment')
      .eq('parent_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: true, comments: [] });
    }

    const comments = (rows || []).map((c: any) => ({
      id: c.id,
      post_id: c.parent_id,
      author_id: c.user_id,
      parent_id: null,
      body: c.content,
      created_at: c.created_at,
      author_name: c.users?.display_name || 'Animal Guardian',
      author_username: c.users?.username || 'guardian',
      author_avatar: c.users?.avatar_url || '',
      author_role: (c.users?.profile_data?.role as any) || 'USER',
    }));

    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
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
    const { body: commentText } = body;

    const cleanText = (commentText || '').trim();
    if (!cleanText) {
      return NextResponse.json({ success: false, error: 'Comment cannot be empty' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Verify parent post exists
    const { data: post, error: postErr } = await supabase
      .from('social_posts')
      .select('id, user_id, content, comments, stats')
      .eq('id', postId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (postErr || !post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Insert comment as a record in social_posts
    const { data: comment, error: insertErr } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        parent_id: postId,
        record_type: 'comment',
        content: cleanText,
        data: {},
        media: [],
        reactions: {},
        comments: {},
        hashtags: [],
        mentions: [],
        visibility: 'public',
        is_active: true,
        is_deleted: false,
        stats: {},
      })
      .select()
      .single();

    if (insertErr || !comment) {
      console.error('Comment insert error:', insertErr);
      return NextResponse.json({ success: false, error: 'Couldn\'t post your comment. Please try again.' }, { status: 400 });
    }

    // Compute updated comment count
    const currentCount = typeof post.comments?.count === 'number'
      ? post.comments.count
      : (typeof post.stats?.comments_count === 'number' ? post.stats.comments_count : 0);

    const newCommentCount = currentCount + 1;

    // Update parent post stats
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

    // Notify post author if not self
    if (post.user_id && post.user_id !== user.id) {
      await supabase.from('platform_data').insert({
        data_type: 'notification',
        user_id: post.user_id,
        target_id: user.id,
        target_user_id: user.id,
        status: 'unread',
        data: {
          type: 'COMMENT',
          title: 'New comment on your post',
          body: `${user.fullName} commented: "${cleanText.slice(0, 60)}${cleanText.length > 60 ? '...' : ''}"`,
          target_url: `/#${postId}`,
          sender_name: user.fullName,
          sender_avatar: user.avatarUrl,
          post_id: postId,
        },
      });
    }

    const formattedComment = {
      id: comment.id,
      post_id: postId,
      author_id: user.id,
      body: comment.content,
      created_at: comment.created_at,
      author_name: user.fullName,
      author_username: user.username,
      author_avatar: user.avatarUrl,
      author_role: user.role,
    };

    return NextResponse.json({
      success: true,
      comment: formattedComment,
      commentCount: newCommentCount,
    });
  } catch (error: any) {
    console.error('Create comment error:', error);
    return NextResponse.json({ success: false, error: 'Couldn\'t post your comment. Please try again.' }, { status: 500 });
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

    const searchParams = request.nextUrl.searchParams;
    let commentId = searchParams.get('commentId');

    if (!commentId) {
      const body = await request.json().catch(() => ({}));
      commentId = body.commentId || body.id;
    }

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'Missing commentId parameter' }, { status: 400 });
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
    console.error('Delete comment error:', error);
    return NextResponse.json({ success: false, error: 'Couldn\'t delete the comment. Please try again.' }, { status: 500 });
  }
}
