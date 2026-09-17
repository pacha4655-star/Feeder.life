import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data: rows, error } = await supabase
      .from('social_posts')
      .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url, role)')
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
      author_name: c.users?.display_name || 'Member',
      author_username: c.users?.username || 'member',
      author_avatar: c.users?.avatar_url || '',
      author_role: c.users?.role || 'COMMUNITY_MEMBER',
    }));

    return NextResponse.json({ success: true, comments });
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
    const { body: commentText } = body;

    if (!commentText || !commentText.trim()) {
      return NextResponse.json({ success: false, error: 'Comment cannot be empty' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Insert comment as a record in social_posts
    const { data: comment, error: insertErr } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        parent_id: postId,
        record_type: 'comment',
        content: commentText.trim(),
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
      return NextResponse.json({ success: false, error: insertErr?.message || 'Failed to post comment' }, { status: 400 });
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

    return NextResponse.json({ success: true, comment: formattedComment });
  } catch (error: any) {
    console.error('Create comment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
