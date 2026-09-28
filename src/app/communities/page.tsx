import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import CommunitiesClient from '@/components/community/CommunitiesClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Animal Welfare Communities | Feeder.life',
  description: 'Discover local animal feeding colonies, rescue networks, and welfare communities near you.',
};

export const dynamic = 'force-dynamic';

export default async function CommunitiesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell user={user} activeTab="communities" showRightSidebar={true}>
      <CommunitiesClient user={user} />
    </AppShell>
  );
}

