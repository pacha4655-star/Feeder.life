import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import SettingsClient from '@/components/settings/SettingsClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings & Preferences | Feeder.life',
  description: 'Manage your Feeder.life account credentials, privacy filters, notifications, and feeding preferences.',
  robots: {
    index: false,
    follow: false,
  },
};

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

