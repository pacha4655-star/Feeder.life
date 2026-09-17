import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import CommunitiesClient from '@/components/community/CommunitiesClient';

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

