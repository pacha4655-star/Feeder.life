import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import ReelsClient from '@/components/reels/ReelsClient';
import { FeedRankingService } from '@/lib/services/feed-ranking';

export const dynamic = 'force-dynamic';

export default async function ReelsPage() {
  const user = await getCurrentUser();

  // Query real reels/videos from database
  const initialReels = await FeedRankingService.getRankedFeed({
    userId: user ? user.id : 'guest',
    tab: 'REELS',
    limit: 20,
  });

  return (
    <AppShell user={user} activeTab="reels" showRightSidebar={false}>
      <ReelsClient user={user} initialReels={initialReels} />
    </AppShell>
  );
}
