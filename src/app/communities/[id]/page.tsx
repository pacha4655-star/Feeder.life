import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import CommunityDetailClient from '@/components/community/CommunityDetailClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CommunityPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const supabase = getSupabaseServerClient();

  // Try finding by id or slug
  let query = supabase.from('communities').select('*');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid) {
    query = query.or(`id.eq.${id},slug.eq.${id}`);
  } else {
    query = query.eq('slug', id);
  }

  const { data: commRows } = await query.limit(1);
  const comm = commRows && commRows[0];

  if (!comm) {
    notFound();
  }

  const members: string[] = Array.isArray(comm.members) ? comm.members : [];
  const roles: Record<string, string> = typeof comm.roles === 'object' && comm.roles ? comm.roles : {};
  const isJoined = user ? members.includes(user.id) : false;
  const userRole = user ? (roles[user.id] || (isJoined ? 'MEMBER' : null)) : null;

  const community = {
    id: comm.id,
    name: comm.name,
    slug: comm.slug,
    description: comm.description,
    category: comm.community_type || 'COMMUNITY',
    location_area: comm.city || '',
    cover_image: comm.cover_url,
    avatar_image: comm.avatar_url,
    is_private: comm.is_private ? 1 : 0,
    rules_text: Array.isArray(comm.rules) ? comm.rules.join('\n') : (comm.rules || ''),
    created_by: comm.created_by,
    member_count: members.length || comm.stats?.members_count || 1,
    actual_members: members.length || comm.stats?.members_count || 1,
    user_role: userRole,
    is_joined: isJoined,
  };

  // Get community posts
  const { data: postRows } = await supabase
    .from('social_posts')
    .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url, role)')
    .eq('community_id', comm.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const parsedPosts = (postRows || []).map((p: any) => ({
    id: p.id,
    author_id: p.user_id,
    author_name: p.users?.display_name || 'Community Member',
    author_username: p.users?.username || 'member',
    author_avatar: p.users?.avatar_url || '',
    author_role: p.users?.role || 'COMMUNITY_MEMBER',
    community_name: comm.name,
    community_id: comm.id,
    content_type: p.post_type || 'GENERAL',
    title: p.title || '',
    body: p.content || '',
    location_name: p.location_name || '',
    media_urls: Array.isArray(p.media) ? p.media.map((m: any) => (typeof m === 'string' ? m : m.url)) : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    reaction_count: p.likes_count || 0,
    comment_count: p.comments_count || 0,
    created_at: p.created_at,
    user_reaction: null,
  }));

  return (
    <AppShell user={user} activeTab="communities" showRightSidebar={true}>
      <CommunityDetailClient
        community={community}
        initialPosts={parsedPosts}
        user={user}
      />
    </AppShell>
  );
}
