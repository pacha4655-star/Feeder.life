import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import SettingsClient from '@/components/settings/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell user={user} activeTab="settings" showRightSidebar={false}>
      <SettingsClient user={user} />
    </AppShell>
  );
}

