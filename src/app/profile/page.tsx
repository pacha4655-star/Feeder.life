import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfileIndexPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  redirect(`/profile/${user.username}`);
}
