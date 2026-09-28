import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import HelpSupportClient from '@/components/help/HelpSupportClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & Support | Feeder.life',
  description: 'Official animal guardian guides, issue reporting, ticket tracking, safety policies, and Feeder.life support.',
};

export const dynamic = 'force-dynamic';

interface HelpSectionPageProps {
  params: Promise<{
    section: string;
  }>;
}

export default async function HelpSectionPage({ params }: HelpSectionPageProps) {
  const user = await getCurrentUser();
  const { section } = await params;

  return (
    <AppShell user={user} activeTab="help" showRightSidebar={false}>
      <HelpSupportClient user={user} initialSection={section} />
    </AppShell>
  );
}
