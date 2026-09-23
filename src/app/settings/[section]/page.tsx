import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import SettingsClient from '@/components/settings/SettingsClient';

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
