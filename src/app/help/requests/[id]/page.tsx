import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import HelpSupportClient from '@/components/help/HelpSupportClient';

export const dynamic = 'force-dynamic';

interface RequestDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const { id } = await params;

  return (
    <AppShell user={user} activeTab="help" showRightSidebar={false}>
      <HelpSupportClient user={user} initialSection="requests" requestId={id} />
    </AppShell>
  );
}
