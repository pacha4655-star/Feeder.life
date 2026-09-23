import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import HelpSupportClient from '@/components/help/HelpSupportClient';

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} activeTab="help" showRightSidebar={false}>
      <HelpSupportClient user={user} initialSection="overview" />
    </AppShell>
  );
}
