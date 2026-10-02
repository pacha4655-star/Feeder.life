import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import AnimalsClient from '@/components/animals/AnimalsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Animal Registry & Digital Passports | Feeder.life',
  description: 'Community animal registry, digital medical passports, vaccination records, and adoption directory.',
};

export const dynamic = 'force-dynamic';

export default async function AnimalsPage() {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} activeTab="animals" showRightSidebar={true}>
      <AnimalsClient user={user} />
    </AppShell>
  );
}
