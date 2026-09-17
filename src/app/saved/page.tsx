import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import SavedPostsClient from '@/components/saved/SavedPostsClient';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { PostWithAuthor } from '@/lib/services/feed-ranking';

export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  let initialPosts: PostWithAuthor[] = [];


  if (user) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: savedRows } = await supabase
        .from('platform_data')
        .select('target_id, created_at')
        .eq('data_type', 'saved_post')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const postIds = (savedRows || []).map((r: any) => r.target_id).filter(Boolean);

      if (postIds.length > 0) {
        const { data: postRows } = await supabase
          .from('social_posts')
          .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url, role), communities!social_posts_community_id_fkey(id, name, slug)')
          .in('id', postIds)
          .eq('is_deleted', false);

        initialPosts = (postRows || []).map((row: any) => ({
          id: row.id,
          author_id: row.user_id,
          author_name: row.users?.display_name || 'Community Member',
          author_username: row.users?.username || 'member',
          author_avatar: row.users?.avatar_url || '',
          author_role: row.users?.role || 'COMMUNITY_MEMBER',
          author_feeder_level: 'Feeder',
          community_id: row.community_id,
          community_name: row.communities?.name,
          community_slug: row.communities?.slug,
          content_type: row.post_type || 'GENERAL',
          title: row.title || '',
          body: row.content || '',
          media_urls: Array.isArray(row.media) ? row.media.map((m: any) => (typeof m === 'string' ? m : m.url)) : [],
          tags: Array.isArray(row.tags) ? row.tags : [],
          location_name: row.location_name || '',
          visibility: row.visibility || 'PUBLIC',
          reaction_count: row.likes_count || 0,
          comment_count: row.comments_count || 0,
          share_count: 0,
          user_reaction: null,
          is_saved: true,
          created_at: row.created_at,
        }));
      }
    } catch {}
  }

  return (
    <AppShell user={user} activeTab="saved" showRightSidebar={true}>
      <SavedPostsClient user={user} initialPosts={initialPosts} />
    </AppShell>
  );
}
