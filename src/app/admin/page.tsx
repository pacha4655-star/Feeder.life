import { getCurrentUser } from '@/lib/auth/session';
import { isPlatformStaff } from '@/lib/security/rbac';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import AdminClient from '@/components/admin/AdminClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Enforce staff role authorization (PLATFORM_ADMIN or PLATFORM_MODERATOR)
  if (!isPlatformStaff(user.role)) {
    redirect('/');
  }

  const supabase = getSupabaseServerClient();

  // Fetch reports from platform_data
  const { data: reportRows } = await supabase
    .from('platform_data')
    .select('*, users!platform_data_user_id_fkey(id, username, display_name)')
    .eq('data_type', 'report')
    .order('created_at', { ascending: false })
    .limit(50);

  const reports = (reportRows || []).map((r: any) => ({
    id: r.id,
    reporter_id: r.user_id,
    target_type: r.data?.target_type || 'POST',
    target_id: r.target_id,
    reason: r.data?.reason || '',
    details: r.data?.details || '',
    status: r.status || 'PENDING',
    created_at: r.created_at,
    reporter_name: r.users?.display_name || 'Member',
    reporter_username: r.users?.username || 'member',
  }));

  // Fetch users
  const { data: userRows } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  const users = (userRows || []).map((u: any) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    full_name: u.display_name || u.username,
    role: u.role || 'USER',
    status: u.is_active ? 'ACTIVE' : 'SUSPENDED',
    created_at: u.created_at,
    feeder_level: u.profile_data?.feeder_level || 'Grassroots Feeder',
    feeding_count: u.profile_data?.feeding_count || 0,
  }));

  // Fetch communities
  const { data: commRows } = await supabase
    .from('communities')
    .select('*, users!communities_created_by_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  const communities = (commRows || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    member_count: Array.isArray(c.members) ? c.members.length : (c.stats?.members_count || 1),
    created_at: c.created_at,
    creator_name: c.users?.display_name || 'Community Member',
  }));

  // Fetch audit logs
  const { data: auditRows } = await supabase
    .from('platform_data')
    .select('*, users!platform_data_user_id_fkey(display_name)')
    .eq('data_type', 'audit')
    .order('created_at', { ascending: false })
    .limit(50);

  const auditLogs = (auditRows || []).map((a: any) => ({
    id: a.id,
    user_id: a.user_id,
    action: a.data?.action || 'ACTION',
    entity_type: a.data?.entity_type || 'SYSTEM',
    entity_id: a.target_id,
    details_json: JSON.stringify(a.data || {}),
    created_at: a.created_at,
    user_name: a.users?.display_name || 'System',
  }));

  return (
    <AppShell user={user} activeTab="admin" showRightSidebar={false}>
      <AdminClient
        user={user}
        initialReports={reports}
        initialUsers={users}
        initialCommunities={communities}
        initialAuditLogs={auditLogs}
      />
    </AppShell>
  );
}
