import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import AskFeederClient from '@/components/ai/AskFeederClient';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ask Feeder AI | Feeder.life',
  description: 'AI-assisted street animal care, dietary guidance, first aid advice, and feeder rights assistant.',
};

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

