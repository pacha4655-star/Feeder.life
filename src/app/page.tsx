import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import FeedListWrapper from '@/components/feed/FeedListWrapper';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell user={user} activeTab="home" showRightSidebar={true}>
      <FeedListWrapper user={user} />
    </AppShell>
  );
}

