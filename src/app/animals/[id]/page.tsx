import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/layout/AppShell';
import AnimalPassportClient from '@/components/animals/AnimalPassportClient';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { data: animal } = await supabase
    .from('animals')
    .select('name, species, breed, description, avatar_url')
    .eq('id', id)
    .maybeSingle();

  if (!animal) {
    return {
      title: 'Animal Passport | Feeder.life',
    };
  }

  return {
    title: `${animal.name || 'Community Animal'} - Digital Animal Passport | Feeder.life`,
    description: animal.description || `Digital medical and vaccination passport for ${animal.name || animal.species} on Feeder.life.`,
  };
}

export const dynamic = 'force-dynamic';

export default async function AnimalPassportPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  const supabase = getSupabaseServerClient();
  const { data: animal, error } = await supabase
    .from('animals')
    .select('*, users!animals_created_by_fkey(id, username, display_name, avatar_url, role)')
    .eq('id', id)
    .maybeSingle();

  if (error || !animal) {
    notFound();
  }

  return (
    <AppShell user={user} activeTab="animals" showRightSidebar={true}>
      <AnimalPassportClient initialAnimal={animal} user={user} />
    </AppShell>
  );
}
