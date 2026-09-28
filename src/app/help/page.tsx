import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import HelpSupportClient from '@/components/help/HelpSupportClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & Support Center | Feeder.life',
  description: 'Official animal guardian guides, issue reporting, ticket tracking, safety policies, and Feeder.life support.',
};

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} activeTab="help" showRightSidebar={false}>
      <HelpSupportClient user={user} initialSection="overview" />
    </AppShell>
  );
}
