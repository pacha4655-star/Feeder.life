import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ConnectionsClient, { GuardianItem } from '@/components/connections/ConnectionsClient';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ConnectionsPage(props: { searchParams?: Promise<{ tab?: string }> }) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const tabParam = searchParams?.tab as 'following' | 'followers' | 'discover' | undefined;
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const supabase = getSupabaseServerClient();
  const currentUserId = user.id;

  // Get set of followed users by current user
  let followedSet = new Set<string>();
  // Get set of followers of current user
  let followersSet = new Set<string>();

  if (user) {
    try {
      const { data: followRows } = await supabase
        .from('platform_data')
        .select('target_id')
        .eq('data_type', 'follow')
        .eq('user_id', user.id);
      followedSet = new Set((followRows || []).map((r: any) => r.target_id));

      const { data: followerRows } = await supabase
        .from('platform_data')
        .select('user_id')
        .eq('data_type', 'follow')
        .eq('target_id', user.id);
      followersSet = new Set((followerRows || []).map((r: any) => r.user_id));
    } catch {}
  }

  // 1. Fetch all users from Supabase users table
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(100);

  const mapUserToGuardian = (u: any): GuardianItem => ({
    id: u.id,
    fullName: u.display_name || u.username,
    username: u.username,
    avatarUrl: u.avatar_url,
    role: u.role || 'USER',
    feederLevel: u.profile_data?.feeder_level || 'Grassroots Feeder',
    areaName: u.profile_data?.area_name || '',
    city: u.city || '',
    feedingCount: u.profile_data?.feeding_count || 0,
    sosCount: u.profile_data?.sos_count || 0,
    isFollowing: followedSet.has(u.id),
    followerCount: 0,
  });

  const allGuardians = (allUsers || []).map(mapUserToGuardian);
  const following = allGuardians.filter((g) => followedSet.has(g.id));
  const followers = allGuardians.filter((g) => followersSet.has(g.id));
  const discover = allGuardians.filter((g) => g.id !== currentUserId);

  const initialTab = tabParam || (following.length > 0 ? 'following' : 'discover');

  return (
    <AppShell user={user} activeTab="connections" showRightSidebar={true}>
      <ConnectionsClient
        user={user}
        initialTab={initialTab}
        following={following}
        followers={followers}
        discover={discover}
      />
    </AppShell>
  );
}
