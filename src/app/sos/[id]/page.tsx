import { getCurrentUser } from '@/lib/auth/session';
import { SosService } from '@/lib/services/sos';
import AppShell from '@/components/layout/AppShell';
import SOSCaseDetail from '@/components/sos/SOSCaseDetail';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const sosCase = await SosService.getCaseById(id);

  if (!sosCase) {
    return {
      title: 'Emergency Case | Feeder.life',
    };
  }

  return {
    title: `[${sosCase.urgency} SOS] ${sosCase.title} | Feeder.life Emergency Desk`,
    description: sosCase.description || `Live animal rescue alert for ${sosCase.animal_type} at ${sosCase.approx_location_name}.`,
  };
}

export const dynamic = 'force-dynamic';

export default async function SOSCasePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  const sosCase = await SosService.getCaseById(id, null, null, user?.id);

  if (!sosCase) {
    notFound();
  }

  return (
    <AppShell user={user} activeTab="sos" showRightSidebar={true}>
      <SOSCaseDetail initialCase={sosCase} user={user} />
    </AppShell>
  );
}
