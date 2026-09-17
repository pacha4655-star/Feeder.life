import { getCurrentUser } from '@/lib/auth/session';
import AppShell from '@/components/layout/AppShell';
import MessagesClient from '@/components/messages/MessagesClient';
import { MessagingService, ConversationSummary } from '@/lib/services/messaging';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; with?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const targetUserParam = params.user || params.with;

  let initialConversations: ConversationSummary[] = [];
  let availableGuardians: any[] = [];
  let initialSelectedConvId: string | null = null;

  if (user) {
    if (targetUserParam && targetUserParam !== user.id && targetUserParam !== user.username) {
      try {
        const supabase = getSupabaseServerClient();
        // Look up by user id or username
        const { data: matchedUser } = await supabase
          .from('users')
          .select('id')
          .or(`id.eq.${targetUserParam},username.eq.${targetUserParam.toLowerCase()}`)
          .maybeSingle();

        if (matchedUser && matchedUser.id !== user.id) {
          initialSelectedConvId = await MessagingService.getOrCreateDirectConversation(user.id, matchedUser.id);
        }
      } catch {}
    }

    try {
      initialConversations = await MessagingService.getConversations(user.id);
      if (!initialSelectedConvId && initialConversations.length > 0) {
        initialSelectedConvId = initialConversations[0].id;
      }
    } catch {}

    try {
      const supabase = getSupabaseServerClient();
      const { data: rows } = await supabase
        .from('users')
        .select('id, display_name, username, avatar_url, role')
        .neq('id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(40);

      availableGuardians = (rows || []).map((r: any) => ({
        id: r.id,
        fullName: r.display_name || r.username,
        username: r.username,
        avatarUrl: r.avatar_url || '',
        role: r.role || 'USER',
      }));
    } catch {}
  }

  return (
    <AppShell user={user} activeTab="messages" showRightSidebar={false}>
      <MessagesClient
        user={user}
        initialConversations={initialConversations}
        availableGuardians={availableGuardians}
        initialSelectedConvId={initialSelectedConvId}
      />
    </AppShell>
  );
}
