import React from 'react';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { LostFoundService } from '@/lib/services/lost-found';
import LostFoundClient from '@/components/lost-found/LostFoundClient';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Lost & Found Animals Network | Feeder.life',
  description:
    'Report lost pets and found community animals. Connect with local guardians and review potential candidate matches.',
};

export const dynamic = 'force-dynamic';

export default async function LostFoundPage() {
  const user = await getCurrentUser();

  const { reports } = await LostFoundService.listReports({
    reportType: 'LOST',
    limit: 30,
  });

  return (
    <AppShell user={user} activeTab="lost-found" showRightSidebar={true}>
      <LostFoundClient initialReports={reports} user={user} />
    </AppShell>
  );
}
