import React from 'react';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/session';
import { ImpactService } from '@/lib/services/impact';
import ImpactDashboardClient from '@/components/impact/ImpactDashboardClient';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Welfare Impact, Streaks & Badges | Feeder.life',
  description:
    'Track your verified feeding streak, earn transparent animal welfare milestones and badges, and view privacy-safe area-wise community impact.',
};

export const dynamic = 'force-dynamic';

export default async function ImpactPage() {
  const user = await getCurrentUser();
  const userId = user?.id || 'anonymous';

  const [userData, areasData] = await Promise.all([
    ImpactService.getUserImpact(userId),
    ImpactService.getAreaImpact(),
  ]);

  return (
    <AppShell user={user} activeTab="impact" showRightSidebar={true}>
      <ImpactDashboardClient
        initialUserData={userData}
        initialAreasData={areasData}
        user={user}
      />
    </AppShell>
  );
}
