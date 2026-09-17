import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import ProfileClient from '@/components/profile/ProfileClient';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params;
  const currentUser = await getCurrentUser();
  const supabase = getSupabaseServerClient();

  const { data: userRows, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', username)
    .limit(1);

  const supaUser = userRows && userRows[0];
  if (error || !supaUser) {
    notFound();
  }

  const profileUser = {
    id: supaUser.id,
    firebase_uid: supaUser.firebase_uid,
    email: supaUser.email,
    username: supaUser.username,
    full_name: supaUser.display_name || supaUser.username,
    avatar_url: supaUser.avatar_url,
    role: supaUser.role || 'USER',
    bio: supaUser.bio || '',
    city: supaUser.city || '',
    area_name: supaUser.profile_data?.area_name || '',
    feeder_level: supaUser.profile_data?.feeder_level || 'Grassroots Feeder',
    feeding_count: supaUser.profile_data?.feeding_count || 0,
    sos_responses_count: supaUser.profile_data?.sos_count || 0,
    community_contributions_count: supaUser.profile_data?.contributions_count || 0,
    cover_url: supaUser.profile_data?.cover_image_url || (supaUser as any).cover_url || null,
    badges: ['Welfare Advocate'],
    created_at: supaUser.created_at,
  };

  // User posts from Supabase
  const { data: postRows } = await supabase
    .from('social_posts')
    .select('*, users!social_posts_user_id_fkey(id, username, display_name, avatar_url, role)')
    .eq('user_id', supaUser.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const posts = (postRows || []).map((p: any) => ({
    id: p.id,
    author_id: p.user_id,
    author_name: p.users?.display_name || 'Member',
    author_username: p.users?.username || 'member',
    author_avatar: p.users?.avatar_url || '',
    author_role: p.users?.role || 'COMMUNITY_MEMBER',
    content_type: p.post_type || 'GENERAL',
    title: p.title || '',
    body: p.content || '',
    media_urls: Array.isArray(p.media) ? p.media.map((m: any) => (typeof m === 'string' ? m : m.url)) : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    location_name: p.location_name || '',
    reaction_count: p.likes_count || 0,
    comment_count: p.comments_count || 0,
    created_at: p.created_at,
    user_reaction: null,
  }));

  // User feeding logs
  const { data: feedingRows } = await supabase
    .from('social_posts')
    .select('*')
    .eq('user_id', supaUser.id)
    .eq('post_type', 'feeding')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const feedingLogs = (feedingRows || []).map((f: any) => ({
    id: f.id,
    user_id: f.user_id,
    user_name: profileUser.full_name,
    user_avatar: profileUser.avatar_url,
    animal_type: 'Canine',
    animal_count: 5,
    food_type: 'Boiled Rice & Chicken',
    fed_at: f.created_at,
  }));

  return (
    <AppShell user={currentUser} activeTab="profile" showRightSidebar={true}>
      <ProfileClient
        profileUser={profileUser}
        posts={posts}
        feedingLogs={feedingLogs}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
