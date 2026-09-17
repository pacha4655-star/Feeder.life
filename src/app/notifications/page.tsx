import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import NotificationsClient, { NotificationItem } from '@/components/notifications/NotificationsClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  let initialNotifications: NotificationItem[] = [];


  if (user) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: rows } = await supabase
        .from('platform_data')
        .select('*')
        .eq('data_type', 'notification')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      initialNotifications = (rows || []).map((r: any) => ({
        id: r.id,
        recipient_id: r.user_id,
        sender_id: r.target_id || null,
        type: r.data?.type || 'SYSTEM',
        title: r.data?.title || 'Notification',
        body: r.data?.body || '',
        target_url: r.data?.target_url || '/notifications',
        is_read: r.status === 'read' ? 1 : 0,
        created_at: r.created_at,
        sender_name: r.data?.sender_name || null,
        sender_avatar: r.data?.sender_avatar || null,
      }));
    } catch {}
  }

  return (
    <AppShell user={user} activeTab="notifications" showRightSidebar={true}>
      <NotificationsClient user={user} initialNotifications={initialNotifications} />
    </AppShell>
  );
}
