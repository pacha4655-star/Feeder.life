import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ReelsClient from '@/components/reels/ReelsClient';
import { FeedRankingService } from '@/lib/services/feed-ranking';

export const dynamic = 'force-dynamic';

export default async function ReelsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  // Query real reels/videos from database
  const initialReels = await FeedRankingService.getRankedFeed({
    userId: user.id,
    tab: 'REELS',
    limit: 20,
  });


  return (
    <AppShell user={user} activeTab="reels" showRightSidebar={false}>
      <ReelsClient user={user} initialReels={initialReels} />
    </AppShell>
  );
}
