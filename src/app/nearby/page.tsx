import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import NearbyClient from '@/components/nearby/NearbyClient';

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

