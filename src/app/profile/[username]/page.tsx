import { getCurrentUser } from '@/lib/auth/session';
import { ProfileService } from '@/lib/services/profile';
import AppShell from '@/components/layout/AppShell';
import ProfileClient from '@/components/profile/ProfileClient';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const profileData = await ProfileService.getProfileData(
    username,
    currentUser.id
  );

  if (!profileData) {
    notFound();
  }

  return (
    <AppShell user={currentUser} activeTab="profile" showRightSidebar={true}>
      <ProfileClient
        profileUser={profileData.profileUser}
        posts={profileData.posts}
        feedingLogs={profileData.feedingLogs}
        currentUser={currentUser}
      />
    </AppShell>
  );
}
