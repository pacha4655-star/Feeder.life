import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { canModifyResource, canDeleteResource } from '@/lib/security/rbac';
import { sanitizeText } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params;
    const supabase = getSupabaseServerClient();
    const { data: post, error } = await supabase
      .from('social_posts')
      .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url, role)')
      .eq('id', postId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const formattedPost = {
      id: post.id,
      author_id: post.user_id,
      author_name: post.users?.display_name || 'Community Member',
      author_username: post.users?.username || 'member',
      author_avatar: post.users?.avatar_url || '',
      author_role: post.users?.role || 'COMMUNITY_MEMBER',
      title: post.title || '',
      body: post.content || '',
      content_type: post.post_type || 'GENERAL',
      location_name: post.location_name || '',
      media_urls: Array.isArray(post.media) ? post.media.map((m: any) => (typeof m === 'string' ? m : m.url)) : [],
      tags: Array.isArray(post.tags) ? post.tags : [],
      reaction_count: post.likes_count || 0,
      comment_count: post.comments_count || 0,
      created_at: post.created_at,
    };

    return NextResponse.json({ success: true, post: formattedPost });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { content, title, body: rawBody } = body;

    const newContent = sanitizeText(content || rawBody);
    if (!newContent) {
      return NextResponse.json({ success: false, error: 'Post content cannot be empty' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: post } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    if (!canModifyResource(user.id, user.role, post.user_id)) {
      logger.security('IDOR attempt: User tried to edit another user post', {
        userId: user.id,
        targetPostId: postId,
        postAuthorId: post.user_id,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot edit a post you did not create.' },
        { status: 403 }
      );
    }

    const { error: updateErr } = await supabase
      .from('social_posts')
      .update({
        content: newContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, postId, content: newContent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data: post } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle();

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    if (!canDeleteResource(user.id, user.role, post.user_id)) {
      logger.security('IDOR attempt: User tried to delete another user post', {
        userId: user.id,
        targetPostId: postId,
        postAuthorId: post.user_id,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot delete a post you did not create.' },
        { status: 403 }
      );
    }

    await supabase
      .from('social_posts')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', postId);

    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
