import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import SettingsClient from '@/components/settings/SettingsClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | Feeder.life',
  description: 'Manage your Feeder.life account credentials, privacy filters, notifications, and feeding preferences.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

interface SettingsSectionPageProps {
  params: Promise<{
    section: string;
  }>;
}

export default async function SettingsSectionPage({ params }: SettingsSectionPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await params;

  return (
    <AppShell user={user} activeTab="settings" showRightSidebar={false}>
      <SettingsClient user={user} initialSection={resolvedParams.section} />
    </AppShell>
  );
}
