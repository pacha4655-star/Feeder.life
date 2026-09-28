import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import NearbyClient from '@/components/nearby/NearbyClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nearby Feeders & Animal Colonies | Feeder.life',
  description: 'Interactive map and directory of local feeders, street animal colonies, and active rescue volunteers.',
};

export const dynamic = 'force-dynamic';

export default async function NearbyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell user={user} activeTab="nearby" showRightSidebar={true}>
      <NearbyClient user={user} />
    </AppShell>
  );
}

