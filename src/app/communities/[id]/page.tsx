import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import CommunityDetailClient from '@/components/community/CommunityDetailClient';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CommunityPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

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

  const memberIds: string[] = Array.isArray(comm.members) ? comm.members : [];
  const roles: Record<string, string> = typeof comm.roles === 'object' && comm.roles ? comm.roles : {};
  const settings = comm.settings || {};
  const pendingRequestIds: string[] = Array.isArray(settings.pending_requests) ? settings.pending_requests : [];

  const isJoined = user ? memberIds.includes(user.id) : false;
  const isPending = user ? pendingRequestIds.includes(user.id) : false;
  const userRole = user
    ? roles[user.id] || (comm.created_by === user.id ? 'founder' : isJoined ? 'member' : null)
    : null;
  const isFounderOrAdmin = userRole === 'founder' || userRole === 'admin' || user?.role === 'PLATFORM_ADMIN';

  // Fetch real member details
  let memberUsers: any[] = [];
  if (memberIds.length > 0) {
    const { data: mUsers } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, city, is_verified, profile_data')
      .in('id', memberIds.slice(0, 50));

    memberUsers = (mUsers || []).map((u: any) => ({
      id: u.id,
      username: u.username || 'user',
      full_name: u.display_name || u.username || 'Animal Guardian',
      avatar_url: u.avatar_url,
      city: u.city || '',
      is_verified: !!u.is_verified,
      role: roles[u.id] || (comm.created_by === u.id ? 'founder' : 'member'),
    }));
  }

  // Fetch pending request user details if founder/admin
  let pendingUsers: any[] = [];
  if (isFounderOrAdmin && pendingRequestIds.length > 0) {
    const { data: pUsers } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, city, is_verified')
      .in('id', pendingRequestIds.slice(0, 30));

    pendingUsers = (pUsers || []).map((u: any) => ({
      id: u.id,
      username: u.username || 'user',
      full_name: u.display_name || u.username || 'Animal Guardian',
      avatar_url: u.avatar_url,
      city: u.city || '',
      is_verified: !!u.is_verified,
    }));
  }

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
    created_at: comm.created_at,
    member_count: memberIds.length || comm.stats?.members_count || 1,
    actual_members: memberIds.length || comm.stats?.members_count || 1,
    user_role: userRole,
    is_joined: isJoined,
    is_pending: isPending,
    is_admin: isFounderOrAdmin,
    members: memberUsers,
    pending_requests: pendingUsers,
  };

  // Get community posts (Private communities protect posts from non-members)
  let parsedPosts: any[] = [];
  if (!comm.is_private || isJoined || isFounderOrAdmin) {
    const { data: postRows } = await supabase
      .from('social_posts')
      .select('id, user_id, community_id, content, data, media, reactions, comments, stats, created_at')
      .eq('community_id', comm.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (postRows && postRows.length > 0) {
      const authorIds = Array.from(new Set(postRows.map((p) => p.user_id).filter(Boolean)));
      const { data: authors } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, role')
        .in('id', authorIds);

      const authorMap = new Map((authors || []).map((a: any) => [a.id, a]));

      parsedPosts = postRows.map((p: any) => {
        const author = authorMap.get(p.user_id);
        return {
          id: p.id,
          author_id: p.user_id,
          author_name: author?.display_name || author?.username || 'Community Member',
          author_username: author?.username || 'member',
          author_avatar: author?.avatar_url || '',
          author_role: author?.role || 'COMMUNITY_MEMBER',
          community_name: comm.name,
          community_id: comm.id,
          content_type: p.data?.content_type || 'GENERAL',
          title: p.data?.title || '',
          body: p.content || '',
          location_name: p.data?.location_name || '',
          media_urls: Array.isArray(p.media) ? p.media.map((m: any) => (typeof m === 'string' ? m : m.url)) : [],
          tags: Array.isArray(p.data?.tags) ? p.data.tags : [],
          reaction_count: p.stats?.likes_count || 0,
          comment_count: p.stats?.comments_count || p.comments?.count || 0,
          created_at: p.created_at,
          user_reaction: null,
        };
      });
    }
  }

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
