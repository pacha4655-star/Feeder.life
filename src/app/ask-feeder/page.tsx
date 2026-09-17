import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import AskFeederClient from '@/components/ai/AskFeederClient';

export const dynamic = 'force-dynamic';

export default async function AskFeederPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell user={user} activeTab="ask-feeder" showRightSidebar={false}>
      <AskFeederClient user={user} />
    </AppShell>
  );
}

