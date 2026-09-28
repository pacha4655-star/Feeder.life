import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import FeedingClient from '@/components/feeding/FeedingClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feeding Logs & Streaks | Feeder.life',
  description: 'Track your daily street animal feeding logs, volunteer streaks, and karma milestones.',
};

export const dynamic = 'force-dynamic';

export default async function FeedingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell user={user} activeTab="feeding" showRightSidebar={true}>
      <FeedingClient user={user} />
    </AppShell>
  );
}

