import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import AdoptionClient from '@/components/adoption/AdoptionClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Adoption & Foster Care Portal | Feeder.life',
  description: 'Community animal adoption, temporary foster care network, screening applications, and rehoming directory.',
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ tab?: string; animalId?: string }>;
}

export default async function AdoptionPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const { tab, animalId } = await searchParams;

  return (
    <AppShell user={user} activeTab="adoption" showRightSidebar={true}>
      <AdoptionClient user={user} initialTab={tab} preselectedAnimalId={animalId} />
    </AppShell>
  );
}
